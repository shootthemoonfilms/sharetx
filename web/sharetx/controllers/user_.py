import logging

import os, os.path
from urllib import quote_plus, unquote_plus, unquote
import random
import hmac

from pylons import request, response, session, config, tmpl_context as c
from pylons.controllers.util import abort, redirect_to, redirect

from sqlalchemy.orm.exc import NoResultFound

from sharetx.lib.base import BaseController, render, MicroMock
from sharetx.model import *

log = logging.getLogger(__name__)

class UserController(BaseController):

    def _r(self, name):
        if name in request.params:
            return request.params[name]

    def _message(self, message, message_class):
        c.username = self._r('username')
        c.email = self._r('email')
        c.message = message
        c.message_class = message_class

        return render('/home.mako')

    def _user_dir(self, username):
        return os.path.join(config['pylons.cache_dir'], 'projects',
                            quote_plus(username))

    def home(self):
        c.hash = self._r('action');

        if self._r('action') == 'login':
            return self._login()
        elif self._r('action') == 'create':
            return self._create()
        elif self._r('action') == 'reset':
            return self._reset()
        else:
            return render('/home.mako')

    def _login(self):
        if not self._r('username'):
            return self._message('Error loging in', 'error')

        try:
            user_q = meta.Session.query(User)
            user = user_q.filter(User.username == self._r('username')).one()
    
            if user.password == user.enc(self._r('password')):
                session['username'] = user.username
                session.save()
                return redirect_to(controller='user', action='app', _code=301)
        except NoResultFound:
            pass

        return self._message('Incorrect username or password', 'error')

    def _create(self):
        if not self._r('username'):
            return self._message('Username missing', 'error')
        elif not self._r('password'):
            return self._message('Password missing', 'error')
        elif self._r('password_confirmation') != self._r('password'):
            return self._message('Passwords do not match', 'error')
        elif not self._r('email'):
            return self._message('Email missing', 'error')
        else:
            user_q = meta.Session.query(User)
            if user_q.filter(User.username == self._r('username')).count() > 0:
                return self._message('User already exists', 'error')

            os.makedirs(self._user_dir(self._r('username')))
            user = User()
            user.username = self._r('username')
            user.password = user.enc(self._r('password'))
            user.email = self._r('email')
            meta.Session.add(user)
            meta.Session.commit()

            return self._login()

    def _reset(self):
        if not self._r('username') and not self._r('email'):
            return self._message('Enter username or email', 'error')

        user_q = meta.Session.query(User)
        try:
            if self._r('username'):
                user = user_q.filter(User.username == self._r('username')).one()
            elif self._r('email'):
                user = user_q.filter(User.email == self._r('email')).one()

            return self._message('Check your email for more information', 'ok')
        except NoResultFound:
            return self._message('No user found', 'error')

    def app(self):
        if not 'username' in session:
            raise 'FIXME: no username'

        return render('/app.mako')

    def projects(self):
        projects = os.listdir(self._user_dir(session['username']))

        c.projects = [ MicroMock(url=unquote_plus(project),
                                 name=unquote_plus(project))
                      for project in projects ]

        return render('/user/projects.mako')

    def logout(self):
        if 'username' in session:
            del session['username']
            session.save()

        return redirect('/', code=301)
