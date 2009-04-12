import logging

from pylons import request, response, session, tmpl_context as c
from pylons.controllers.util import abort, redirect_to

from sharetx.lib.base import BaseController, render

log = logging.getLogger(__name__)

class ShareController(BaseController):

    def overview(self, uri, revision):
        return render('/project/share.mako')
