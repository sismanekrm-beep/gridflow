import requests
import sys
import json
from datetime import datetime

class LabelSystemAPITester:
    def __init__(self, base_url="https://quick-label-gen.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_product_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text[:200]}")
                except:
                    pass

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API",
            "GET",
            "api/",
            200
        )
        return success

    def test_get_stats(self):
        """Test stats endpoint"""
        success, response = self.run_test(
            "Get Stats",
            "GET", 
            "api/stats",
            200
        )
        if success:
            print(f"   Total products: {response.get('total_products', 0)}")
            print(f"   Recent products: {len(response.get('recent_products', []))}")
        return success

    def test_get_products(self):
        """Test get products with pagination"""
        success, response = self.run_test(
            "Get Products (page 1)",
            "GET",
            "api/products?page=1&limit=10",
            200
        )
        if success:
            print(f"   Found {response.get('total', 0)} products")
            print(f"   Page {response.get('page', 1)} of {response.get('pages', 1)}")
        return success

    def test_search_products(self):
        """Test product search"""
        success, response = self.run_test(
            "Search Products (DIN)",
            "GET",
            "api/products?query=DIN&limit=5",
            200
        )
        if success:
            products = response.get('products', [])
            print(f"   Found {len(products)} products matching 'DIN'")
            for p in products[:2]:
                print(f"   - {p.get('code', 'N/A')}: {p.get('name', 'N/A')}")
        return success

    def test_create_product(self):
        """Test creating a new product"""
        test_product = {
            "code": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "name": "Test Ürün",
            "measurement": "M6X20",
            "standard_code": "TEST123",
            "quality": "A2",
            "description": "Test açıklaması",
            "default_qty": 5,
            "image_url": None
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "api/products",
            200,
            data=test_product
        )
        
        if success:
            self.created_product_id = response.get('id')
            print(f"   Created product ID: {self.created_product_id}")
            print(f"   Product code: {response.get('code')}")
        return success

    def test_get_product_by_code(self):
        """Test getting product by code"""
        # Try to get an existing product first
        success, products_response = self.run_test(
            "Get Products for Code Test",
            "GET",
            "api/products?limit=1",
            200
        )
        
        if success and products_response.get('products'):
            product_code = products_response['products'][0]['code']
            success, response = self.run_test(
                f"Get Product by Code ({product_code})",
                "GET",
                f"api/products/code/{product_code}",
                200
            )
            if success:
                print(f"   Found product: {response.get('name', 'N/A')}")
            return success
        else:
            print("   No products found to test get by code")
            return True  # Skip this test if no products exist

    def test_update_product(self):
        """Test updating a product"""
        if not self.created_product_id:
            print("   Skipping update test - no product created")
            return True
            
        update_data = {
            "name": "Updated Test Ürün",
            "quality": "A4",
            "default_qty": 10
        }
        
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"api/products/{self.created_product_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated name: {response.get('name')}")
            print(f"   Updated quality: {response.get('quality')}")
        return success

    def test_get_settings(self):
        """Test get settings"""
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "api/settings",
            200
        )
        if success:
            print(f"   Brand name: {response.get('brand_name', 'N/A')}")
            print(f"   Print margins: {response.get('print_margin_x')}x{response.get('print_margin_y')}")
        return success

    def test_update_settings(self):
        """Test update settings"""
        settings_data = {
            "brand_name": "Test Marka",
            "print_margin_x": 10.0,
            "print_margin_y": 13.0
        }
        
        success, response = self.run_test(
            "Update Settings",
            "PUT",
            "api/settings",
            200,
            data=settings_data
        )
        
        if success:
            print(f"   Updated brand name: {response.get('brand_name')}")
        return success

    def test_delete_product(self):
        """Test deleting a product"""
        if not self.created_product_id:
            print("   Skipping delete test - no product created")
            return True
            
        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"api/products/{self.created_product_id}",
            200
        )
        
        if success:
            print(f"   Delete message: {response.get('message', 'N/A')}")
        return success

    def test_get_nonexistent_product(self):
        """Test getting non-existent product"""
        success, response = self.run_test(
            "Get Non-existent Product",
            "GET",
            "api/products/nonexistent-id",
            404
        )
        return success

    def test_get_nonexistent_product_by_code(self):
        """Test getting non-existent product by code"""
        success, response = self.run_test(
            "Get Non-existent Product by Code",
            "GET",
            "api/products/code/NONEXISTENT-CODE-123",
            404
        )
        return success

def main():
    print("🚀 Starting Label System API Tests")
    print("=" * 50)
    
    tester = LabelSystemAPITester()
    
    # Run all tests
    tests = [
        tester.test_root_endpoint,
        tester.test_get_stats,
        tester.test_get_products,
        tester.test_search_products,
        tester.test_get_settings,
        tester.test_update_settings,
        tester.test_create_product,
        tester.test_get_product_by_code,
        tester.test_update_product,
        tester.test_delete_product,
        tester.test_get_nonexistent_product,
        tester.test_get_nonexistent_product_by_code,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())