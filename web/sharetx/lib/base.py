"""The base Controller API

Provides the BaseController class for subclassing.
"""

import os.path
from urllib import quote_plus

from pylons import request, config
from pylons.controllers import WSGIController
from pylons.templating import render_mako as render

from sharetx.model import meta

class BaseController(WSGIController):

    def __call__(self, environ, start_response):
        """Invoke the Controller"""
        # WSGIController.__call__ dispatches to the Controller method
        # the request is routed to. This routing information is
        # available in environ['pylons.routes_dict']
        try:
            return WSGIController.__call__(self, environ, start_response)
        finally:
            meta.Session.remove()


class MicroMock(object):

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def req(name, default=None):
    if name in request.params:
        return request.params[name]
    else:
        return default

def userdir(username):
    return os.path.join(config['pylons.cache_dir'], 'projects',
                        quote_plus(username))
