import logging

import os, os.path
from urllib import quote_plus, unquote_plus, unquote

from pylons import request, response, session, config, tmpl_context as c
from pylons.controllers.util import abort, redirect_to

from sharetx.lib.base import BaseController, render, MicroMock

log = logging.getLogger(__name__)

class UserController(BaseController):

    def home(self):
        if len(request.params) > 0 and request.params['message_id'] == '1':
            c.message = '<span class="error">Error loging in</span>'

        return render('/home.mako')

    def access(self):
        if request.params['action'] == 'login':
            if request.params['password'] == request.params['username']:
                session['username'] = request.params['username']
                session.save()
                return redirect_to(controller='user', action='app')
            else:
                return redirect_to(controller='user', action='home', message_id='1')
        elif request.params['action'] == 'register':
            return render('/user/new.mako')

    def app(self):
        if not 'username' in session:
            raise 'FIXME: no username'

        return render('/app.mako')

    def projects(self):
        projects = os.listdir(os.path.join(config['pylons.cache_dir'],
                                           'projects',
                                           quote_plus(session['username'])))

        c.projects = [ MicroMock(url=unquote_plus(project), name=unquote_plus(project))
                       for project in projects ]

        return render('/user/projects.mako')

