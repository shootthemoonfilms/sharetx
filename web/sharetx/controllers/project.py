import logging

import os, os.path
import subprocess
import shutil
from zipfile import ZipFile, is_zipfile
from tempfile import mkdtemp
import StringIO
from datetime import datetime
import uuid

from bzrlib.workingtree import WorkingTree
from bzrlib.branch import Branch
from bzrlib.bzrdir import BzrDir

from rdflib import Namespace, RDF
from rdflib.Graph import Graph, Literal, URIRef

from pylons import request, response, session, config, tmpl_context as c
from pylons.controllers.util import abort, redirect_to

from sharetx.lib.base import BaseController, render, MicroMock, req, userdir

log = logging.getLogger(__name__)

class ProjectController(BaseController):

    def __before__(self):
        self.zipfile = None
        self.pv = None

        if not 'username' in session:
            raise 'FIXME: no username'

        if 'project_file' in request.POST:
            uploaded_project = request.POST['project_file']
            self.zipfile = ZipFile(uploaded_project.file, 'r')

    def __after__(self):
        if self.zipfile:
            self.zipfile.close()

        if self.pv:
            self.pv.cleanup()

    #################################
    # Work without an upload

    def filelist(self, uri, revision):
        pv = ProjectVersioning(uri, revision)

        c.files = pv.filelist()

        return render('/project/filelist.mako')

    def info(self, uri, revision):
        pv = ProjectVersioning(uri, revision)
        rev = pv.last_revision()

        c.name = pv.project.projectname()
        # FIXME timezone
        c.last_modified = datetime.fromtimestamp(rev.timestamp).replace(microsecond=0)
        c.last_author = ', '.join(rev.get_apparent_authors())
        c.last_message = rev.message
        c.last_revision = '.'.join(str(i) for i in pv.branch.revision_id_to_dotted_revno(rev.revision_id))
        c.revision = revision

        return render('/project/info.mako')

    def history(self, uri, revision):
        pv = ProjectVersioning(uri, revision)

        # TODO populate history

        return render('/project/history.mako')

    def file(self, uri, revision, file):
        pv = ProjectVersioning(uri, revision)

        return pv.readfile(file)

    def revision(self, uri):
        return str(ProjectVersioning(uri).last_revision_number())

    def download(self, uri):
        pv = ProjectVersioning(uri)

        return pv.package()

    #################################
    # Work with an upload

    def new(self):
        if request.method == 'POST':
            pv = ProjectVersioning(self.zipfile, new=True)
    
            pv.checkin(req('m', 'New Project'))

            return "OK %s" % pv.uri
        else:
            return render('/dialogs/new.mako')

    def upload(self):
        message = req('m', 'Upload Project')
        pv = ProjectVersioning(self.zipfile)

        pv.update()
        pv.checkin(message)

        return pv.package()

    def update(self):
        pv = ProjectVersioning(self.zipfile)

        pv.update()

        return pv.package()

    #################################
    # Share

    def share(self, name, revision, subaction):
        return getattr(self, 'share_%s' % subaction)(name, revision)

    def share_overview(self, name, revision):
        return render('/project/share.mako')


################################################################################
################################################################################
################################################################################
################################################################################


class ProjectVersioning(object):

    def __init__(self, source, revision=None, new=False):
        self.revision = revision and int(revision)
        self.new = new
        self.project = None
        self.uri = None
        self.zipfile = None

        if isinstance(source, basestring):
            self.uri = source
        elif isinstance(source, ZipFile):
            self.zipfile = source
            if new:
                self.uri = str(uuid.uuid1())
            else:
                self.uri = self.zipfile.read('uri')

        if not self.uri:
            raise "URI not found", source

        self.checkout_path = mkdtemp()
        self.branch_path = os.path.join(userdir(session['username']), self.uri)

        if self.new:
            if os.path.exists(self.branch_path):
                raise 'Project already exists', self.branch_path
    
            os.makedirs(self.branch_path)
            self.branch = BzrDir.create_branch_convenience(self.branch_path)
        else:
            self.branch = Branch.open(self.branch_path)

        if self.new:
            self.checkout()
            self._save('uri', self.uri)
            self.extract()
        elif self.zipfile:
            self.extract()
        else:
            self.checkout()

        self.project = CeltxRDFUtils(self.checkout_path)

    def _save(self, file, data):
        path = os.path.join(self.checkout_path, file)
        f = open(path, 'w')
        f.write(data)
        f.close()
        self.wt.add(file)

    def checkout(self, revision=None):
        """ Checks out a project in a specific revision """

        self.branch.create_checkout(self.checkout_path, lightweight=True)
        self.wt = WorkingTree.open(self.checkout_path)

    def extract(self):
        """ Extracts a project """

        if self.new:
            self._extract()
        else:
            self._extract()
            self.wt = WorkingTree.open(self.checkout_path)

        for name in os.listdir(self.checkout_path):
            if name != '.bzr':
                self.wt.add(name)

    def _extract(self):
        for name in self.zipfile.namelist():
            path = os.path.join(self.checkout_path, name)
            f = open(path, 'w')
            f.write(self.zipfile.read(name))
            f.close()   

    def update(self, message):
        """ Updates the working tree """

        self.wt.update()

    def checkin(self, message):
        """ Checks in the project """

        self.wt.commit(message=message, authors=[session['username']])

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

        return self.project.filelist()

    def readfile(self, file):
        """ Returns the contents of a file """

        # TODO use RevisionTree to make this process faster

        f = open(os.path.join(self.checkout_path, file))
        contents = f.read()

        if self.project.fileinfo(file).doctype == cx["ScriptDocument"]:
            contents = contents.replace('chrome://celtx/content/', '/css/celtx/')

        f.close()

        return contents

    def cleanup(self):
        """ Deletes the checkout """

        shutil.rmtree(self.checkout_path)


################################################################################
################################################################################
################################################################################
################################################################################


dc = Namespace('http://purl.org/dc/elements/1.1/')
cx = Namespace('http://celtx.com/NS/v1/')
sx = Namespace('http://sharetx.com/NS/v1/')

class CeltxRDFUtils:

    def __init__(self, source):
        if isinstance(source, ZipFile):
            source = StringIO.StringIO(source.read('project.rdf'))
        elif isinstance(source, basestring) and os.path.isdir(source):
            source = os.path.join(source, 'project.rdf')

        self.g = Graph()
        self.g.parse(source)

    def projectid(self):
        return list(self.g.subjects(RDF.type, cx['Project']))[0]

    def projectname(self):
        return list(self.g.objects(self.projectid(), dc['title']))[0]

    def fileinfo(self, fileid):
        """ Returns an object with file information """

        file = dict(self.g.predicate_objects(self.fileid(fileid)))

        return MicroMock(title=file[dc['title']],
                         localFile=file[cx['localFile']],
                         doctype=file[cx['doctype']])

    def filelist(self):
        """ Returns a list of files within a project """

        # FIXME read project and contents from rdf don't just add all files
        for pred in self.g.subject_objects(cx['localFile']):
            yield self.fileinfo(pred[0])

    def fileid(self, filename):
        """ Returns the id of a file """

        if isinstance(filename, URIRef):
            return filename
        else:
            return list(self.g.subjects(cx['localFile'], Literal(filename)))[0]
