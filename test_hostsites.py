"""
Test script for the Host Sites API endpoints.
Target: http://dev.evbuddy.net:9005
"""
import requests
import json
import sys

BASE_URL = "http://dev.evbuddy.net:9005"

def sep(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print('=' * 60)

def print_response(resp):
    print(f"  Status : {resp.status_code}")
    try:
        print(f"  Body   : {json.dumps(resp.json(), indent=2)}")
    except Exception:
        print(f"  Body   : {resp.text[:500]}")

# -----------------------------------------------------------
# 1. GET all host sites
# -----------------------------------------------------------
sep("GET /hostsites  (list all)")
try:
    resp = requests.get(f"{BASE_URL}/hostsites", timeout=10)
    print_response(resp)
except Exception as e:
    print(f"  Error: {e}")

# -----------------------------------------------------------
# 2. POST create a new host site
# -----------------------------------------------------------
sep("POST /hostsites  (create)")
new_site = {
    "name": "Chandra Residence",
    "city": None,
    "region": None,
    "country": None,
    "latitude": 10,
    "longitude": 20,
    "timezone": None,
    "host_id": 1030,
    "address_line1": None,
    "address_line2": None,
    "postal_code": None,
    "is_active": 1
}
created_id = None
try:
    resp = requests.post(
        f"{BASE_URL}/hostsites",
        json=new_site,
        timeout=10,
    )
    print_response(resp)
    if resp.status_code == 201:
        created_id = resp.json().get("id")
        print(f"\n  >> Created site id: {created_id}")
except Exception as e:
    print(f"  Error: {e}")

# -----------------------------------------------------------
# 3. GET the newly created host site by id
# -----------------------------------------------------------
if created_id:
    sep(f"GET /hostsites/{created_id}  (read back)")
    try:
        resp = requests.get(f"{BASE_URL}/hostsites/{created_id}", timeout=10)
        print_response(resp)
    except Exception as e:
        print(f"  Error: {e}")

# -----------------------------------------------------------
# 4. GET chargers for the site (may be empty)
# -----------------------------------------------------------
if created_id:
    sep(f"GET /chargers/site/{created_id}  (chargers for site)")
    try:
        resp = requests.get(f"{BASE_URL}/chargers/site/{created_id}", timeout=10)
        print_response(resp)
    except Exception as e:
        print(f"  Error: {e}")

# -----------------------------------------------------------
# Done
# -----------------------------------------------------------
print("\n" + "=" * 60)
print("  All host-sites tests complete.")
print("=" * 60 + "\n")
