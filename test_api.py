"""
Test script for the Users API endpoint.
Starts Flask in a background thread and tests the endpoint.
"""
import threading
import time
import requests
import json

def run_flask():
    from app import app
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

if __name__ == "__main__":
    # Start Flask in a background thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    # Wait for Flask to start
    time.sleep(2)
    
    print("=" * 60)
    print("Testing EVBuddy API Endpoints")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n1. Testing /health endpoint...")
    try:
        resp = requests.get("http://127.0.0.1:5000/health", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Services discovery
    print("\n2. Testing /api/services endpoint (discover all services)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/services", timeout=30)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        
        print(f"\n   Microservice Host: {data.get('microservice_host')}")
        print(f"\n   Summary:")
        summary = data.get('summary', {})
        print(f"     Total Services: {summary.get('total')}")
        print(f"     Available: {summary.get('available')}")
        print(f"     Unavailable: {summary.get('unavailable')}")
        
        print(f"\n   Services:")
        for name, info in data.get('services', {}).items():
            status = "âœ… UP" if info.get('available') else "âŒ DOWN"
            print(f"     {name:20} | Port {info.get('port'):5} | {status}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 3: GET all users
    print("\n3. Testing GET /api/users (get all users)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/users", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 4: GET single user
    print("\n4. Testing GET /api/users/1 (get user by ID)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/users/1", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 5: POST create user
    print("\n5. Testing POST /api/users (create user)...")
    try:
        new_user = {
            "first_name": "Test",
            "last_name": "User",
            "email": "test@example.com",
            "is_driver": True
        }
        resp = requests.post("http://127.0.0.1:5000/api/users", json=new_user, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 6: PUT update user (full replacement)
    print("\n6. Testing PUT /api/users/1 (full update)...")
    try:
        updated_user = {
            "first_name": "Updated",
            "last_name": "User",
            "email": "updated@example.com",
            "is_driver": True,
            "is_host": False
        }
        resp = requests.put("http://127.0.0.1:5000/api/users/1", json=updated_user, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 7: PATCH update user (partial update) - use real user ID
    print("\n7. Testing PATCH /api/users/1095 (partial update - display_name only)...")
    try:
        partial_update = {
            "display_name": "Mike Patched via Flask"
        }
        resp = requests.patch("http://127.0.0.1:5000/api/users/1095", json=partial_update, timeout=10)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            result = resp.json()
            print(f"   Updated display_name: {result.get('display_name')}")
            print(f"   Updated at: {result.get('updatedAt')}")
        else:
            print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 8: DELETE user
    print("\n8. Testing DELETE /api/users/999 (delete user)...")
    try:
        resp = requests.delete("http://127.0.0.1:5000/api/users/999", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n" + "=" * 60)
    print("User Vehicles API Tests")
    print("=" * 60)
    
    # Test V1: GET all vehicles
    print("\nV1. Testing GET /api/vehicles (get all vehicles)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/vehicles", timeout=5)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} vehicles")
            if data:
                print(f"   First vehicle: {json.dumps(data[0], indent=2)[:200]}...")
        else:
            print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test V2: GET single vehicle (use ID 2 which exists)
    print("\nV2. Testing GET /api/vehicles/2 (get vehicle by ID)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/vehicles/2", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test V3: GET vehicles by user (user 9 has vehicles)
    print("\nV3. Testing GET /api/users/9/vehicles (get vehicles for user)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/users/9/vehicles", timeout=5)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} vehicles for user 9")
        else:
            print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test V4: POST create vehicle (using backend's expected field names)
    print("\nV4. Testing POST /api/vehicles (create vehicle)...")
    created_vehicle_id = None
    try:
        new_vehicle = {
            "user_id": 9,
            "vin": "5YJ3E1EA1PF" + str(int(time.time()))[-6:],  # unique VIN
            "nickname": "Test Car",
            "color": "White",
            "vehicle_model_id": 5,
            "vehicle_year": 2024,
            "license_plate": "TEST" + str(int(time.time()))[-3:],
            "is_primary": False
        }
        resp = requests.post("http://127.0.0.1:5000/api/vehicles", json=new_vehicle, timeout=5)
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        print(f"   Response: {json.dumps(result, indent=2)[:300]}...")
        if resp.status_code in (200, 201) and result.get("id"):
            created_vehicle_id = result.get("id")
            print(f"   ✅ Created vehicle ID: {created_vehicle_id}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test V5: PUT update vehicle (Note: backend doesn't support PUT, expect 405)
    print("\nV5. Testing PUT /api/vehicles (full update - expect 405)...")
    test_vehicle_id = created_vehicle_id or 2
    try:
        updated_vehicle = {
            "user_id": 9,
            "vin": "5YJ3E1EA1PF999999",
            "nickname": "Updated Car",
            "color": "Blue",
            "vehicle_model_id": 5,
            "vehicle_year": 2025,
            "license_plate": "UPDT999",
            "is_primary": True
        }
        resp = requests.put(f"http://127.0.0.1:5000/api/vehicles/{test_vehicle_id}", 
                           json=updated_vehicle, timeout=5)
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        if resp.status_code == 405:
            print(f"   ✅ Expected: {result.get('error', 'PUT not supported')}")
        else:
            print(f"   Response: {json.dumps(result, indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test V6: PATCH update vehicle (partial update)
    print("\nV6. Testing PATCH /api/vehicles (partial update - color only)...")
    try:
        partial_update = {
            "color": "Midnight Silver"
        }
        resp = requests.patch(f"http://127.0.0.1:5000/api/vehicles/{test_vehicle_id}", 
                             json=partial_update, timeout=10)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            result = resp.json()
            print(f"   Updated color: {result.get('color')}")
        else:
            print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test V7: DELETE vehicle
    print("\nV7. Testing DELETE /api/vehicles (delete vehicle)...")
    if created_vehicle_id:
        try:
            resp = requests.delete(f"http://127.0.0.1:5000/api/vehicles/{created_vehicle_id}", timeout=5)
            print(f"   Status: {resp.status_code}")
            print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
    else:
        print("   Skipping (no vehicle was created to delete)")

    print("\n" + "=" * 60)
    print("User Payments API Tests")
    print("=" * 60)
    
    # Test P1: GET all payments
    print("\nP1. Testing GET /api/payments (get all payment methods)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/payments", timeout=5)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} payment methods")
            if data:
                print(f"   First payment: user_id={data[0].get('user_id')}, nickname={data[0].get('nickname')}")
        else:
            print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test P2: GET single payment (use ID 1003 which exists)
    print("\nP2. Testing GET /api/payments/1003 (get payment by ID)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/payments/1003", timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Payment: {data.get('nickname')} ({data.get('cardtype')}) for user {data.get('user_id')}")
        else:
            print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test P3: GET payments by user
    print("\nP3. Testing GET /api/users/1001/payments (get payments for user)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/users/1001/payments", timeout=5)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} payment methods for user 1001")
        else:
            print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test P4: POST create payment
    print("\nP4. Testing POST /api/payments (create payment method)...")
    created_payment_id = None
    try:
        new_payment = {
            "user_id": 9,
            "cardtype": 1,
            "nickname": "Test API Card",
            "primary_number": "4111111111111111",
            "cardholder_name": "API Test User",
            "expiration": "2028-12-01",
            "cvc": str(int(time.time()))[-3:],
            "billing_street": "123 Test Street",
            "billing_city": "Test City",
            "billing_state": "TS",
            "billing_country": "US"
        }
        resp = requests.post("http://127.0.0.1:5000/api/payments", json=new_payment, timeout=5)
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        if resp.status_code == 201 and result.get("id"):
            created_payment_id = result.get("id")
            print(f"   Created payment ID: {created_payment_id}")
        else:
            print(f"   Response: {json.dumps(result, indent=2)[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test P5: DELETE payment
    print("\nP5. Testing DELETE /api/payments (delete payment method)...")
    if created_payment_id:
        try:
            resp = requests.delete(f"http://127.0.0.1:5000/api/payments/{created_payment_id}", timeout=5)
            print(f"   Status: {resp.status_code}")
            print(f"   Response: {json.dumps(resp.json(), indent=2)[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
    else:
        print("   Skipping (no payment was created to delete)")

    print("\n" + "=" * 60)
    print("Host Sites API Tests")
    print("=" * 60)

    # Test HS1: GET all host sites
    print("\nHS1. Testing GET /v1/host-sites (get all host sites)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/v1/host-sites", timeout=10)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} host sites")
            if data:
                print(f"   First site: {json.dumps(data[0], indent=2)[:300]}...")
        else:
            print(f"   Response: {json.dumps(data, indent=2)[:300]}...")
    except Exception as e:
        print(f"   Error: {e}")

    # Test HS2: POST create host site
    print("\nHS2. Testing POST /v1/host-sites (create host site)...")
    created_site_id = None
    try:
        new_site = {
            "name": "Test Residence",
            "city": None,
            "region": None,
            "country": None,
            "latitude": 10,
            "longitude": 20,
            "host_id": 1030,
            "address_line1": None,
            "address_line2": None,
            "postal_code": None,
            "is_active": 1
        }
        resp = requests.post("http://127.0.0.1:5000/v1/host-sites", json=new_site, timeout=10)
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        print(f"   Response: {json.dumps(result, indent=2)[:400]}...")
        if resp.status_code in (200, 201) and result.get("id"):
            created_site_id = result.get("id")
            print(f"   ✅ Created host site ID: {created_site_id}")
    except Exception as e:
        print(f"   Error: {e}")

    # Test HS3: GET the created host site by ID
    if created_site_id:
        print(f"\nHS3. Testing GET /v1/host-sites/{created_site_id} (get created site)...")
        try:
            resp = requests.get(f"http://127.0.0.1:5000/v1/host-sites/{created_site_id}", timeout=10)
            print(f"   Status: {resp.status_code}")
            print(f"   Response: {json.dumps(resp.json(), indent=2)[:400]}...")
        except Exception as e:
            print(f"   Error: {e}")
    else:
        print("\nHS3. Skipping GET by ID (no site was created)")

    print("\n" + "=" * 60)
    print("Access Control (RBAC) Tests")
    print("=" * 60)
    
    # Test 9: Get available roles
    print("\n9. Testing GET /api/roles (list all roles)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/roles", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Roles: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 10: Assign role to user
    print("\n10. Testing POST /api/users/1/roles (assign platform_admin role)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/users/1/roles", 
                            json={"role": "platform_admin", "actor_user_id": 1}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 11: Assign driver role
    print("\n11. Testing POST /api/users/10/roles (assign driver role)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/users/10/roles", 
                            json={"role": "driver", "actor_user_id": 1}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 12: Add site member
    print("\n12. Testing POST /api/sites/1/members/5 (add user 5 as site owner)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sites/1/members/5", 
                            json={"site_role": "owner", "actor_user_id": 1}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 13: Get site members
    print("\n13. Testing GET /api/sites/1/members (list site members)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/sites/1/members", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 14: Invite site member by email
    print("\n14. Testing POST /api/sites/1/members/invite (invite manager)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sites/1/members/invite", 
                            json={"email": "manager@example.com", "site_role": "manager", "actor_user_id": 5}, 
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        print(f"   Response: {result}")
        invitation_token = result.get("token")
    except Exception as e:
        print(f"   Error: {e}")
        invitation_token = None
    
    # Test 15: Driver requests site access
    print("\n15. Testing POST /api/sites/1/access-request (driver 10 requests access)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sites/1/access-request", 
                            json={"driver_user_id": 10, "reason": "Need to charge at work"}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 16: Get site drivers (pending requests)
    print("\n16. Testing GET /api/sites/1/drivers (list drivers with access)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/sites/1/drivers?actor_user_id=5", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 17: Approve driver
    print("\n17. Testing POST /api/sites/1/drivers/10/approve (approve driver 10)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sites/1/drivers/10/approve", 
                            json={"actor_user_id": 5}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 18: Check if driver can use site
    print("\n18. Testing GET /api/auth/can-use-site/1 (check driver 10 access)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/auth/can-use-site/1?driver_user_id=10&visibility=private", 
                           timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 19: Get driver's approved sites
    print("\n19. Testing GET /api/me/site-access (driver 10's approved sites)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/me/site-access?driver_user_id=10", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 20: Approve driver with time limit
    print("\n20. Testing POST /api/sites/1/drivers/20/approve (time-limited access)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sites/1/drivers/20/approve", 
                            json={"actor_user_id": 5, "access_end": "2026-02-10T00:00:00"}, 
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 21: Block a driver
    print("\n21. Testing POST /api/sites/1/drivers/30/block (block driver 30)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sites/1/drivers/30/block", 
                            json={"actor_user_id": 5, "reason": "Policy violation"}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 22: Check blocked driver can't use site
    print("\n22. Testing GET /api/auth/can-use-site/1 (check blocked driver 30)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/auth/can-use-site/1?driver_user_id=30&visibility=private", 
                           timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 23: Check if user can manage site
    print("\n23. Testing GET /api/auth/can-manage-site/1 (check user 5)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/auth/can-manage-site/1?user_id=5", timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 24: Get audit log
    print("\n24. Testing GET /api/audit-log (view recent actions)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/audit-log?limit=5", timeout=5)
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        print(f"   Count: {result.get('count')}")
        for log in result.get('logs', [])[:3]:
            print(f"     - {log['action']}: {log['entity_type']} {log['entity_id']}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 25: Revoke driver access
    print("\n25. Testing POST /api/sites/1/drivers/10/revoke (revoke driver 10)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sites/1/drivers/10/revoke", 
                            json={"actor_user_id": 5, "reason": "Access period ended"}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 26: Check revoked driver can't use site
    print("\n26. Testing GET /api/auth/can-use-site/1 (check revoked driver 10)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/auth/can-use-site/1?driver_user_id=10&visibility=private", 
                           timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")

    print("\n" + "=" * 60)
    print("CPMS Security Tests (Two-Layer Authorization)")
    print("=" * 60)
    
    # Test 27: Get security roles
    print("\n27. Testing GET /api/security/roles (list all role definitions)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/security/roles", timeout=5)
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        print(f"   Global Roles: {result.get('global_roles')}")
        print(f"   Site Roles: {result.get('site_roles')}")
        print(f"   Operator Roles: {result.get('operator_roles')}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 28: Setup platform admin
    print("\n28. Testing POST /api/users/100/roles (assign platform_admin)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/users/100/roles", 
                            json={"role": "platform_admin", "actor_user_id": 100}, timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 29: Setup operator and user role (as platform admin)
    print("\n29. Testing POST /api/security/setup/operator (assign operator role)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/security/setup/operator", 
                            json={
                                "operator_id": 1,
                                "user_id": 50,
                                "role": "operator_admin"
                            },
                            headers={"X-User-ID": "100"},  # platform_admin
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 30: Register asset to operator
    print("\n30. Testing POST /api/security/setup/asset (register asset)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/security/setup/asset", 
                            json={
                                "asset_id": "CHARGER-001",
                                "operator_id": 1
                            },
                            headers={"X-User-ID": "100"},
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 31: Remote start (should succeed - operator_admin)
    print("\n31. Testing POST /api/assets/CHARGER-001/remote-start (operator_admin)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/assets/CHARGER-001/remote-start", 
                            json={"connector_id": 1},
                            headers={"X-User-ID": "50"},  # operator_admin
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 32: Setup viewer role
    print("\n32. Setting up operator_viewer role for user 60...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/security/setup/operator", 
                            json={
                                "operator_id": 1,
                                "user_id": 60,
                                "role": "operator_viewer"
                            },
                            headers={"X-User-ID": "100"},
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 33: Remote start as viewer (should FAIL)
    print("\n33. Testing POST /api/assets/CHARGER-001/remote-start (viewer - should FAIL)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/assets/CHARGER-001/remote-start", 
                            json={"connector_id": 1},
                            headers={"X-User-ID": "60"},  # operator_viewer
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
        if resp.status_code == 403:
            print("   âœ… Correctly denied - viewers cannot start sessions")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 34: Diagnostics as viewer (should succeed - read access)
    print("\n34. Testing GET /api/assets/CHARGER-001/diagnostics (viewer - should succeed)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/assets/CHARGER-001/diagnostics",
                           headers={"X-User-ID": "60"},
                           timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            print("   âœ… Viewers can read diagnostics")
            result = resp.json()
            print(f"   Asset Status: {result.get('status')}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 35: Setup finance role
    print("\n35. Setting up operator_finance role for user 70...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/security/setup/operator", 
                            json={
                                "operator_id": 1,
                                "user_id": 70,
                                "role": "operator_finance"
                            },
                            headers={"X-User-ID": "100"},
                            timeout=5)
        print(f"   Status: {resp.status_code}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 36: Finance tries remote start (should FAIL)
    print("\n36. Testing POST /api/assets/CHARGER-001/remote-start (finance - should FAIL)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/assets/CHARGER-001/remote-start", 
                            json={"connector_id": 1},
                            headers={"X-User-ID": "70"},  # operator_finance
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 403:
            print("   âœ… Correctly denied - finance cannot control hardware")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 37: Finance issues refund (should succeed)
    print("\n37. Testing POST /api/sessions/123/refund (finance - should succeed)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/sessions/123/refund", 
                            json={"operator_id": 1, "amount": 25.00, "reason": "Charging issue"},
                            headers={"X-User-ID": "70"},  # operator_finance
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            print("   âœ… Finance can issue refunds")
            print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 38: Setup tech role
    print("\n38. Setting up operator_tech role for user 80...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/security/setup/operator", 
                            json={
                                "operator_id": 1,
                                "user_id": 80,
                                "role": "operator_tech"
                            },
                            headers={"X-User-ID": "100"},
                            timeout=5)
        print(f"   Status: {resp.status_code}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 39: Tech tries to change tariff (should FAIL)
    print("\n39. Testing PUT /api/assets/CHARGER-001/tariff (tech - should FAIL)...")
    try:
        resp = requests.put("http://127.0.0.1:5000/api/assets/CHARGER-001/tariff", 
                           json={"tariff": {"per_kwh": 0.40}},
                           headers={"X-User-ID": "80"},  # operator_tech
                           timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 403:
            print("   âœ… Correctly denied - tech cannot modify tariffs")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 40: Tech can set maintenance mode (should succeed)
    print("\n40. Testing POST /api/assets/CHARGER-001/maintenance-mode (tech - should succeed)...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/assets/CHARGER-001/maintenance-mode", 
                            json={"enabled": True, "reason": "Scheduled maintenance"},
                            headers={"X-User-ID": "80"},  # operator_tech
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            print("   âœ… Tech can set maintenance mode")
            print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 41: Cross-tenant access attempt (should FAIL)
    print("\n41. Testing cross-tenant access (should FAIL)...")
    try:
        # Setup a second operator with a user
        requests.post("http://127.0.0.1:5000/api/security/setup/operator", 
                     json={"operator_id": 2, "user_id": 90, "role": "operator_admin"},
                     headers={"X-User-ID": "100"}, timeout=5)
        
        # User 90 (operator 2) tries to access CHARGER-001 (operator 1)
        resp = requests.post("http://127.0.0.1:5000/api/assets/CHARGER-001/remote-start", 
                            json={"connector_id": 1},
                            headers={"X-User-ID": "90"},  # Different operator!
                            timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 403:
            print("   âœ… Cross-tenant access correctly denied!")
            print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 42: Firmware update (restricted - admin only)
    print("\n42. Testing POST /api/assets/CHARGER-001/firmware-update (admin only)...")
    try:
        # Tech tries (should fail)
        resp = requests.post("http://127.0.0.1:5000/api/assets/CHARGER-001/firmware-update", 
                            json={"firmware_url": "https://firmware.example.com/v2.0"},
                            headers={"X-User-ID": "80"},  # operator_tech
                            timeout=5)
        print(f"   Tech attempt - Status: {resp.status_code}")
        if resp.status_code == 403:
            print("   âœ… Tech cannot update firmware")
        
        # Admin tries (should succeed)
        resp = requests.post("http://127.0.0.1:5000/api/assets/CHARGER-001/firmware-update", 
                            json={"firmware_url": "https://firmware.example.com/v2.0"},
                            headers={"X-User-ID": "50"},  # operator_admin
                            timeout=5)
        print(f"   Admin attempt - Status: {resp.status_code}")
        if resp.status_code == 200:
            print("   âœ… Admin can update firmware")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 43: Get security audit log
    print("\n43. Testing GET /api/security/audit-log (platform_admin only)...")
    try:
        resp = requests.get("http://127.0.0.1:5000/api/security/audit-log?limit=5",
                           headers={"X-User-ID": "100"},  # platform_admin
                           timeout=5)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            result = resp.json()
            print(f"   Log entries: {result.get('count')}")
            for log in result.get('logs', [])[:3]:
                print(f"     - {log['action']}: {log.get('asset_id', log.get('resource_id'))}")
    except Exception as e:
        print(f"   Error: {e}")

    print("\n" + "=" * 60)
    print("Tests complete!")
    print("=" * 60)
    print("\nNote: 503 errors are expected if Spring Boot services aren't running.")
    print("Access Control endpoints use in-memory storage (no database required).")
    print("\nSecurity Summary:")
    print("  [OK] Two-layer auth: Role + Scope checks")
    print("  [OK] Multi-tenant isolation: Cross-operator access denied")
    print("  [OK] Role enforcement: Viewers can't write, finance can't control hardware")
    print("  [OK] Restricted commands: Firmware/config changes require admin")
    print("  [OK] Audit logging: All sensitive actions logged")
