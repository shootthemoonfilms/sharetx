from sharetx.tests import *

class TestUserController(TestController):

    def test_index(self):
        response = self.app.get(url(controller='user_', action='index'))
        # Test response...
