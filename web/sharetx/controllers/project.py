import logging

import os, os.path
import subprocess
import shutil
from zipfile import ZipFile
from tempfile import mkdtemp
import StringIO
from urllib import quote_plus, unquote_plus
from datetime import datetime

from bzrlib.workingtree import WorkingTree
from bzrlib.branch import Branch
from bzrlib.bzrdir import BzrDir

from rdflib import Namespace
from rdflib.Graph import Graph, Literal, URIRef

from pylons import request, response, session, config, tmpl_context as c
from pylons.controllers.util import abort, redirect_to

from sharetx.lib.base import BaseController, render, MicroMock

log = logging.getLogger(__name__)
dc = Namespace('http://purl.org/dc/elements/1.1/')
cx = Namespace('http://celtx.com/NS/v1/')

class ProjectController(BaseController):

    def __before__(self):
        if not 'username' in session:
            raise 'FIXME: no username'

    def filelist(self, name, revision):
        pv = ProjectVersioning(name, revision)

        c.files = pv.filelist()

        return render('/project/filelist.mako')

    def info(self, name, revision):
        pv = ProjectVersioning(name)
        rev = pv.last_revision()

        c.name = unquote_plus(name)
        # FIXME timezone
        c.last_modified = datetime.fromtimestamp(rev.timestamp).replace(microsecond=0)
        c.last_author = ', '.join(rev.get_apparent_authors())
        c.last_message = rev.message
        c.last_revision = '.'.join(str(i) for i in pv.branch.revision_id_to_dotted_revno(rev.revision_id))
        c.revision = revision

        return render('/project/info.mako')

    def history(self, name, revision):
        pv = ProjectVersioning(name, revision)

        # TODO populate history

        return render('/project/history.mako')

    def file(self, name, revision, file):
        pv = ProjectVersioning(name, revision)

        return pv.readfile(file)

    #################################
    # Versioning

    def _param(self, p, default):
        if p in request.params:
            return request.params[p]
        else:
            return default

    def new(self):
        name = request.params['project_name']
        message = self._param('m', 'New Project')
        pv = ProjectVersioning(name, new=True)

        pv.extract()
        pv.checkin(message)

        return "OK"

    def upload(self, name):
        message = self._param('m', 'Upload Project')
        pv = ProjectVersioning(name)

        pv.extract()
        pv.update()
        pv.checkin(message)

        return pv.package()

    def update(self, name):
        pv = ProjectVersioning(name)

        pv.extract()
        pv.update()

        return pv.package()

    def download(self, name):
        pv = ProjectVersioning(name)

        pv.checkout()

        return pv.package()

    def revision(self, name):
        return str(ProjectVersioning(name).last_revision_number())

    #################################
    # Share

    def share(self, name, revision, subaction):
        return getattr(self, 'share_%s' % subaction)(name, revision)

    def share_overview(self, name, revision):
        return render('/project/share.mako')


class ProjectVersioning(object):

    def __init__(self, name, revision=None, new=False):
        self.name = name
        self.revision = revision and int(revision)
        self.new = new

        self.branch_path = os.path.join(config['pylons.cache_dir'],
                                        'projects',
                                        quote_plus(session['username']),
                                        quote_plus(self.name))
        self.checkout_path = mkdtemp()

        if self.new:
            if os.path.exists(self.branch_path):
                raise 'Project already exists'
    
            os.makedirs(self.branch_path)
            self.branch = BzrDir.create_branch_convenience(self.branch_path)
        else:
            self.branch = Branch.open(self.branch_path)

    def extract(self):
        """ Extracts a project """

        if self.new:
            self.checkout()
            self._extract()
        else:
            self._extract()
            self.wt = WorkingTree.open(self.checkout_path)

        for name in os.listdir(self.checkout_path):
            if name != '.bzr':
                self.wt.add(name)

    def _extract(self):
        uploaded_project = request.POST['project_file']

        z = ZipFile(uploaded_project.file, 'r')
        for name in z.namelist():
            path = os.path.join(self.checkout_path, name)
            f = open(path, 'w')
            f.write(z.read(name))
            f.close()   
        z.close()

    def checkout(self, revision=None):
        """ Checks out a project in a specific revision """

        self.branch.create_checkout(self.checkout_path, lightweight=True)
        self.wt = WorkingTree.open(self.checkout_path)

    def update(self, message):
        """ Updates the working tree """

        self.wt.update()

    def checkin(self, message):
        """ Checks in the project """

        self.wt.commit(message=message, author=session['username'])

    def package(self):
        """ Package a project and return it to celtx """

        file = StringIO.StringIO()

        z = ZipFile(file, 'w')
        self._addall(z, self.checkout_path, '.')
        z.close()

        # XXX possible memory leak!!! file not closed
        return file.getvalue()

    def _addall(self, z, base_path, sub_path):
        for name in os.listdir(os.path.join(base_path, sub_path)):
            path = os.path.join(base_path, sub_path, name)
            if os.path.isdir(path):
                self._addall(z, base_path, os.path.join(sub_path, path))
            else:
                z.write(path, name)

    def last_revision_number(self):
        """ Returns the last revision number """

        revision_number, revision_id = self.branch.last_revision_info()

        return revision_number

    def last_revision(self):
        """ Returns the last revision """

        revision_number, revision_id = self.branch.last_revision_info()

        return self.branch.repository.get_revision(revision_id)

    def filelist(self):
        """ Returns the list of files for the project """

        # TODO use RevisionTree to make this process faster
        self.checkout()

        return CeltxRDFUtils(self.checkout_path).filelist()


    def readfile(self, file):
        """ Returns the contents of a file """

        # TODO use RevisionTree to make this process faster
        self.checkout()

        f = open(os.path.join(self.checkout_path, file))
        contents = f.read()

        if CeltxRDFUtils(self.checkout_path).fileinfo(file).doctype == cx["ScriptDocument"]:
            contents = contents.replace('chrome://celtx/content/', '/css/celtx/')

        f.close()

        return contents


class CeltxRDFUtils:

    def __init__(self, path):
        self.g = Graph()
        self.g.parse(os.path.join(path, 'project.rdf'))

    def fileinfo(self, fileid):
        """ Returns an object with file information """

        file = dict((file[1], file[2]) for file in self.g.triples((self.fileid(fileid), None, None)))

        return MicroMock(title=file[dc['title']],
                         localFile=file[cx['localFile']],
                         doctype=file[cx['doctype']])

    def filelist(self):
        """ Returns a list of files within a project """

        for pred in self.g.triples((None, cx['localFile'], None)):
            yield self.fileinfo(pred[0])

    def fileid(self, filename):
        """ Returns the id of a file """

        if isinstance(filename, URIRef):
            return filename
        else:
            return list(self.g.triples((None, cx['localFile'], Literal(filename))))[0][0]
