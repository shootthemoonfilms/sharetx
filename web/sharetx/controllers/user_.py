import logging

import os, os.path
from urllib import unquote_plus
import random
import hmac

from pylons import request, response, session, config, tmpl_context as c
from pylons.controllers.util import abort, redirect_to, redirect

from sqlalchemy.orm.exc import NoResultFound

from sharetx.lib.base import BaseController, render, MicroMock, req, userdir
from sharetx.model import *

log = logging.getLogger(__name__)

class UserController(BaseController):

    def _message(self, message, message_class):
        c.username = req('username')
        c.email = req('email')
        c.message = message
        c.message_class = message_class

        return render('/home.mako')

    def home(self):
        c.hash = req('action');

        if req('action') == 'login':
            return self._login()
        elif req('action') == 'create':
            return self._create()
        elif req('action') == 'reset':
            return reqeset()
        else:
            return render('/home.mako')

    def _login(self):
        if not req('username'):
            return self._message('Username missing', 'error')

        try:
            user_q = meta.Session.query(User)
            user = user_q.filter(User.username == req('username')).one()
    
            if user.password == user.enc(req('password')):
                session['username'] = user.username
                session.save()
                return redirect_to(controller='user', action='app', _code=301)
        except NoResultFound:
            pass

        return self._message('Incorrect username or password', 'error')

    def _create(self):
        if not req('username'):
            return self._message('Username missing', 'error')
        elif not req('password'):
            return self._message('Password missing', 'error')
        elif req('password_confirmation') != req('password'):
            return self._message('Passwords do not match', 'error')
        elif not req('email'):
            return self._message('Email missing', 'error')
        else:
            user_q = meta.Session.query(User)
            if user_q.filter(User.username == req('username')).count() > 0:
                return self._message('User already exists', 'error')

            os.makedirs(userdir(req('username')))
            user = User()
            user.username = req('username')
            user.password = user.enc(req('password'))
            user.email = req('email')
            meta.Session.add(user)
            meta.Session.commit()

            return self._login()

    def _reset(self):
        if not req('username') and not req('email'):
            return self._message('Enter username or email', 'error')

        user_q = meta.Session.query(User)
        try:
            if req('username'):
                user = user_q.filter(User.username == req('username')).one()
            elif req('email'):
                user = user_q.filter(User.email == req('email')).one()

            return self._message('Check your email for more information', 'ok')
        except NoResultFound:
            return self._message('No user found', 'error')

    def app(self):
        if not 'username' in session:
            raise 'FIXME: no username'

        return render('/app.mako')

    def projects(self):
        projects = os.listdir(userdir(session['username']))

        c.projects = [ MicroMock(url=unquote_plus(project),
                                 name=self._readname(project))
                      for project in projects ]

        return render('/user/projects.mako')

    def _readname(self, project):
        f = open(os.path.join(userdir(session['username']), project, 'name'))
        name = f.read()
        f.close()
        return name

    def logout(self):
        if 'username' in session:
            del session['username']
            session.save()

        return redirect('/', code=301)
