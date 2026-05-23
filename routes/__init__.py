from .pages import pages_bp
from .ev_charging import ev_charging_bp
from .sites import sites_bp
from .users import users_bp
from .vehicles import vehicles_bp
from .services import services_bp
from .cpms import cpms_bp
from .messaging import messaging_bp
from .v2v import v2v_bp
from .experience import experience_bp
from .dispatch import dispatch_bp
from .operating_hours import operating_hours_bp

ALL_BLUEPRINTS = [
    pages_bp,
    ev_charging_bp,
    sites_bp,
    users_bp,
    vehicles_bp,
    services_bp,
    cpms_bp,
    messaging_bp,
    v2v_bp,
    experience_bp,
    dispatch_bp,
    operating_hours_bp,
]
