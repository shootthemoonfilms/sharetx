"""The application's model objects"""

import hmac

import sqlalchemy as sa
from sqlalchemy import orm
from sqlalchemy.ext.declarative import declarative_base

from sharetx.model import meta

_Base = declarative_base()

def init_model(engine):
    """Call me before using any of the tables or classes in the model"""

    meta.Session.configure(bind=engine)
    meta.engine = engine


class User(_Base):
    __tablename__ = "users"

    id = sa.Column(sa.types.Integer, primary_key=True)
    username = sa.Column(sa.types.String)
    password = sa.Column(sa.types.String)
    email = sa.Column(sa.types.String)

    def enc(self, password):
        return hmac.new(self.username, password).hexdigest()
