"""Setup the sharetx application"""
import logging

from sharetx.config.environment import load_environment
from sharetx import model
from sharetx.model import meta

log = logging.getLogger(__name__)

def setup_app(command, conf, vars):
    """Place any commands to setup sharetx here"""
    load_environment(conf.global_conf, conf.local_conf)

    # Create the tables if they don't already exist
    #meta.metadata.create_all(bind=meta.engine)
    model._Base.metadata.create_all(bind=meta.engine)

