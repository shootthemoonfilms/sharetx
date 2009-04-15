import logging

import os, os.path
from zipfile import ZipFile, is_zipfile
from tempfile import mkdtemp
from datetime import datetime

from bzrlib.workingtree import WorkingTree
from bzrlib.branch import Branch
from bzrlib.bzrdir import BzrDir

from pylons import request, response, session, config, tmpl_context as c
from pylons.controllers.util import abort, redirect

from sharetx.lib.base import BaseController, render, MicroMock, req, userdir

log = logging.getLogger(__name__)

class ProjectController(BaseController):

    def __before__(self):
        self.zipfile = None
        self.pv = None

        if not 'username' in session:
            abort(403, 'User not logged in')

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

            return pv.config.get('sharetx', 'uri')

    def download(self, uri, revision, filename=None):
        pv = ProjectVersioning(uri, revision)

        return self._download(pv, uri, revision, filename)

    def _download(self, pv, uri, revision, filename=None):
        if not filename:
            name = pv.project.projectname()
            return redirect("/project/%s/%s/download/%s.celtx" %
                            (uri, revision, name), code=301)
        else:
            response.headers['content-type'] = 'application/x-celtx'
            return pv.package()

    def update(self):
        pv = ProjectVersioning(self.zipfile)

        pv.update()

        return self._download(pv, pv.config.get('sharetx', 'uri'),
                              pv.last_revision_number())

    def __after__(self):
        if self.zipfile:
            self.zipfile.close()

        if self.pv:
            self.pv.cleanup()


################################################################################
################################################################################
################################################################################
################################################################################

import uuid
import shutil
from ConfigParser import SafeConfigParser
import StringIO


class ProjectVersioning(object):

    def __init__(self, source, revision=None):
        self.revision = revision and int(revision)
        self.project = None
        self.new = False
        self.zipfile = None
        self.config = None

        if isinstance(source, basestring):
            self.config = self._newconf(source)
        elif isinstance(source, ZipFile):
            self.zipfile = source
            try:
                conf = StringIO.StringIO(self.zipfile.read('sharetx.conf'))
                self.config = SafeConfigParser()
                self.config.readfp(conf)
                conf.close()
            except KeyError:
                self.config = self._newconf(str(uuid.uuid1()))
                self.new = True

        if not self.config:
            raise 'Configuration not found', source

        self.checkout_path = mkdtemp()
        self.branch_path = os.path.join(userdir(session['username']),
                                        self.config.get('sharetx', 'uri'))

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
            conf = open(os.path.join(self.checkout_path, 'sharetx.conf'), 'wb')
            self.config.write(conf)
            conf.close()
            self.wt.add('sharetx.conf')
        elif self.zipfile:
            self.extract()
        else:
            self.checkout()

        self.project = CeltxRDFProject(self.checkout_path)

        # Re-read configuration and check version
        conf = os.path.join(self.checkout_path, 'sharetx.conf')
        self.config = SafeConfigParser()
        self.config.read(conf)
        version = self.config.get('sharetx', 'version')
        if version != '1':
            raise 'Not a valid version: %s' % version

    def _newconf(self, uri):
        conf = SafeConfigParser()
        conf.add_section('sharetx')
        conf.set('sharetx', 'version', '1')
        conf.set('sharetx', 'uri', uri)

        return conf

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

        self._extract(self.zipfile)

        if not self.new:
            bzr = os.path.join(self.checkout_path, 'sharetx.bzr')
            bzrzip = ZipFile(bzr)
            self._extract(bzrzip)
            bzrzip.close()
            os.remove(bzr)

            self.wt = WorkingTree.open(self.checkout_path)

        for name in os.listdir(self.checkout_path):
            if name != '.bzr':
                self.wt.add(name)

    def _extract(self, z, subdir='.'):
        where = os.path.join(self.checkout_path, subdir)
        for name in z.namelist():
            path = os.path.join(where, name)
            if '/' in name and not os.path.exists(os.path.dirname(path)):
                os.makedirs(os.path.dirname(path))
            f = open(path, 'w')
            f.write(z.read(name))
            f.close()   

    def package(self):
        """ Package a project and return it to celtx """

        z = ZipFile(os.path.join(self.checkout_path, 'sharetx.bzr'), 'w')
        self._addall(z, self.checkout_path, './.bzr')
        z.close()

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
                if name != './.bzr':
                    self._addall(z, base_path, name)
            else:
                z.write(path, name[2:])

    def update(self):
        """ Updates the working tree """

        self.wt.update()

    def checkin(self, message):
        """ Checks in the project """

        #self.project.save(self.checkout_path)
        self.wt.commit(message=message, authors=[session['username']])
        self._save(os.path.join(self.branch_path, 'name'), self.project.projectname())

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
        if self.project.fileinfo(fileid).doctype == CX['ScriptDocument']:
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

import os.path
from string import rsplit
import StringIO
from zipfile import ZipFile

from rdflib import Namespace, RDF
from rdflib.Graph import Graph, Literal, URIRef


DC = Namespace('http://purl.org/dc/elements/1.1/')
CX = Namespace('http://celtx.com/NS/v1/')
SX = Namespace('http://sharetx.com/NS/v1/')

class CeltxRDFProject:

    def __init__(self, source):
        if isinstance(source, ZipFile):
            source = StringIO.StringIO(source.read('project.rdf'))
        elif isinstance(source, basestring) and os.path.isdir(source):
            source = os.path.join(source, 'project.rdf')

        self.g = Graph()
        self.g.parse(source)

    def projectid(self):
        return self.g.subjects(RDF.type, CX.Project).next()

    def projectname(self):
        return self.g.objects(self.projectid(), DC['title']).next()

    def fileinfo(self, fileid):
        """ Returns an object with file information """

        file = dict(self.g.predicate_objects(fileid))
        title = DC['title'] in file and file[DC['title']] or ''
        doctype = CX.doctype in file and rsplit(file[CX.doctype], '/', 1)[1] or ''
        if not doctype:
            doctype = CX.projectRoot in file and 'Project' or ''
        localfile = CX.localFile in file and file[CX.localFile] or ''
        return MicroMock(title=title, doctype=doctype, localfile=localfile)

    def filelist(self):
        """ Returns a list of files within a project """

        base = self.g.seq(list(self.g.objects(self.projectid(), CX.components))[0])
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
            return list(self.g.subjects(CX.localFile, Literal(filename)))[0]

    def save(self, source):
        """ Saves the project to a file """

        if isinstance(source, basestring) and os.path.isdir(source):
            source = os.path.join(source, 'project.rdf')

        self.g.bind("RDF", RDF)
        self.g.bind("sx", SX)
        self.g.serialize(source, format='pretty-xml')
