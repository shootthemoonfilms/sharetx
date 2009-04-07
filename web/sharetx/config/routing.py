"""Routes configuration

The more specific and detailed routes should be defined first so they
may take precedent over the more generic routes. For more information
refer to the routes manual at http://routes.groovie.org/docs/
"""
from pylons import config
from routes import Mapper

def make_map():
    """Create, configure and return the routes Mapper"""
    map = Mapper(directory=config['pylons.paths']['controllers'],
                 always_scan=config['debug'])
    map.minimization = False

    # The ErrorController route (handles 404/500 error pages); it should
    # likely stay at the top, ensuring it can always be resolved
    map.connect('/error/{action}', controller='error')
    map.connect('/error/{action}/{id}', controller='error')

    # CUSTOM ROUTES HERE
    map.connect('user', '/', controller='user_', action='home')
    map.connect('user', '/user/{action}', controller='user_')

    map.connect('project', '/project/:name/{action}', controller='project')
    map.connect('project', '/project/:name/:revision/{action}', controller='project')
    map.connect('project', '/project/:name/:revision/{action}/:file', controller='project')
    map.connect('project', '/project/:name/:revision/share/:subaction', controller='project', action="share")

    map.connect('/{controller}/{action}')
    map.connect('/{controller}/{action}/{id}')

    return map
