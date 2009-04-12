import logging

import os, os.path
import subprocess
import shutil
from zipfile import ZipFile, is_zipfile
from tempfile import mkdtemp
import StringIO
from datetime import datetime
import uuid
from urllib import quote_plus
from string import rsplit

from bzrlib.workingtree import WorkingTree
from bzrlib.branch import Branch
from bzrlib.bzrdir import BzrDir

from rdflib import Namespace, RDF
from rdflib.Graph import Graph, Literal, URIRef

from pylons import request, response, session, config, tmpl_context as c
from pylons.controllers.util import abort, redirect

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

    def revision(self, uri):
        return str(ProjectVersioning(uri).last_revision_number())

    def filelist(self, uri, revision):
        pv = ProjectVersioning(uri, revision)

        c.files = pv.filelist()

        return render('/project/filelist.mako')

    def info(self, uri, revision):
        pv = ProjectVersioning(uri, revision)
        rev = pv.last_revision()

        c.name = pv.project.projectname()
        c.revision = revision
        c.last_rev = self._rev_to_obj(rev, pv)

        return render('/project/info.mako')

    def _rev_to_obj(self, rev, pv):
        # FIXME timezone
        modified = datetime.fromtimestamp(rev.timestamp).replace(microsecond=0)
        author = ', '.join(rev.get_apparent_authors())
        revision = '.'.join(str(i) for i in pv.branch.revision_id_to_dotted_revno(rev.revision_id))

        return MicroMock(modified=modified, author=author, message=rev.message,
                         revision=revision)

    def history(self, uri, revision):
        pv = ProjectVersioning(uri, revision)

        c.revision = revision
        c.history = [self._rev_to_obj(rev, pv) for rev in pv.history()]
        c.history.reverse()

        return render('/project/history.mako')

    def file(self, uri, revision, file):
        pv = ProjectVersioning(uri, revision)

        return pv.readfile(file)

    def upload(self):
        if request.method != 'POST':
            return render('/dialogs/upload.mako')
        else:
            pv = ProjectVersioning(self.zipfile)
    
            if not pv.new:
                pv.update()

            pv.checkin(req('m', 'Upload Project'))

            return pv.uri

    def download(self, uri, revision, filename=None):
        pv = ProjectVersioning(uri, revision)

        return self._download(pv, uri, revision, filename)

    def _download(self, pv, uri, revision, filename=None):
        if not filename:
            name = pv.project.projectname()
            return redirect("/project/%s/%s/download/%s.celtx" %
                            (uri, revision, name), code=301)
        else:
            response.headers['content-type'] = 'application/zip'
            return pv.package()

    def update(self):
        pv = ProjectVersioning(self.zipfile)

        pv.update()

        return self._download(pv, pv.uri, pv.last_revision_number())

    def __after__(self):
        if self.zipfile:
            self.zipfile.close()

        if self.pv:
            self.pv.cleanup()


################################################################################
################################################################################
################################################################################
################################################################################


class ProjectVersioning(object):

    def __init__(self, source, revision=None):
        self.revision = revision and int(revision)
        self.project = None
        self.uri = None
        self.new = False
        self.zipfile = None

        if isinstance(source, basestring):
            self.uri = source
        elif isinstance(source, ZipFile):
            self.zipfile = source
            try:
                self.uri = self.zipfile.read('uri')
            except KeyError:
                self.uri = str(uuid.uuid1())
                self.new = True

        if not self.uri:
            raise 'URI not found', source

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
            self.extract()
            self._save(os.path.join(self.checkout_path, 'uri'), self.uri)
            self.wt.add('uri')
        elif self.zipfile:
            self.extract()
        else:
            self.checkout()

        self.project = CeltxRDFUtils(self.checkout_path)

    def _save(self, path, data):
        f = open(path, 'w')
        f.write(data)
        f.close()

    def checkout(self):
        """ Checks out a project in a specific revision """

        rev_id = self.revision and self.branch.get_rev_id(self.revision)
        self.branch.create_checkout(self.checkout_path, lightweight=True, revision_id=rev_id)
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
            if '/' in name and not os.path.exists(os.path.dirname(path)):
                os.makedirs(os.path.dirname(path))
            f = open(path, 'w')
            f.write(self.zipfile.read(name))
            f.close()   

    def update(self):
        """ Updates the working tree """

        self.wt.update()

    def checkin(self, message):
        """ Checks in the project """

        self.wt.commit(message=message, authors=[session['username']])
        self._save(os.path.join(self.branch_path, 'name'), self.project.projectname())

    def package(self):
        """ Package a project and return it to celtx """

        file = StringIO.StringIO()
        z = ZipFile(file, 'w')
        self._addall(z, self.checkout_path, '.')
        z.close()
        contents = file.getvalue()
        file.close()

        return contents

    def _addall(self, z, base_path, sub_path):
        for name in os.listdir(os.path.join(base_path, sub_path)):
            name = os.path.join(sub_path, name)
            path = os.path.join(base_path, name)
            if os.path.isdir(path):
                self._addall(z, base_path, name)
            else:
                z.write(path, name[2:])

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

        fileid = self.project.fileid(file)
        if self.project.fileinfo(fileid).doctype == cx['ScriptDocument']:
            contents = contents.replace('chrome://celtx/content/', '/css/celtx/')

        f.close()

        return contents

    def history(self):
        """ Returns the history """

        return [ self.branch.repository.get_revision(revision_id)
                for revision_id in self.branch.revision_history() ]

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
        return self.g.subjects(RDF.type, cx['Project']).next()

    def projectname(self):
        return self.g.objects(self.projectid(), dc['title']).next()

    def fileinfo(self, fileid):
        """ Returns an object with file information """

        file = dict(self.g.predicate_objects(fileid))
        title = dc['title'] in file and file[dc['title']] or ''
        doctype = cx['doctype'] in file and rsplit(file[cx['doctype']], '/', 1)[1] or ''
        if not doctype:
            doctype = cx['projectRoot'] in file and 'Project' or ''
        localfile = cx['localFile'] in file and file[cx['localFile']] or ''
        return MicroMock(title=title, doctype=doctype, localfile=localfile)

    def filelist(self):
        """ Returns a list of files within a project """

        base = self.g.seq(list(self.g.objects(self.projectid(), cx['components']))[0])
        return list(self._filelist(base))


    def _filelist(self, seq):
        for pred in seq:
            r = self.fileinfo(pred)

            s = self.g.seq(pred)
            if s:
                r.filelist = list(self._filelist(s))

            yield r

    def fileid(self, filename):
        """ Returns the id of a file """

        if isinstance(filename, URIRef):
            return filename
        else:
            return list(self.g.subjects(cx['localFile'], Literal(filename)))[0]
