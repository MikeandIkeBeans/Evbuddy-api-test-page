from .pages import pages_bp
from .ev_charging import ev_charging_bp
from .businesses import businesses_bp
from .sites import sites_bp
from .employees import employees_bp
from .drivers import drivers_bp
from .users import users_bp
from .vehicles import vehicles_bp
from .payments import payments_bp
from .services import services_bp
from .cpms import cpms_bp
from .security_routes import security_bp
from .invites import invites_bp
from .operating_hours import operating_hours_bp
from .messaging import messaging_bp

ALL_BLUEPRINTS = [
    pages_bp,
    ev_charging_bp,
    businesses_bp,
    sites_bp,
    employees_bp,
    drivers_bp,
    users_bp,
    vehicles_bp,
    payments_bp,
    services_bp,
    cpms_bp,
    security_bp,
    invites_bp,
    operating_hours_bp,
    messaging_bp,
]
