import os
import json
import sys
import requests

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
EMAIL = "mangal@gmail.com"
PASSWORD = "mangal@123"
PRODUCT_DB = r"C:\Users\saman\Downloads\products.json"


# ------------------ Load Product DB ------------------ #

def load_products():
    if not os.path.exists(PRODUCT_DB):
        print("products.json not found. Creating empty database...")
        with open(PRODUCT_DB, "w") as f:
            json.dump({}, f, indent=4)

    with open(PRODUCT_DB, "r") as f:
        return json.load(f)


# ------------------ Backend Auth ------------------ #

def get_access_token(email: str, password: str) -> str:
    resp = requests.post(
        f"{BASE_URL}/login",
        json={"email": email, "password": password},
        timeout=10
    )
    resp.raise_for_status()

    data = resp.json()
    if data.get("error"):
        raise RuntimeError(f"Login failed: {data.get('message')}")

    token = data.get("accessToken")
    if not token:
        raise RuntimeError("No access token received")

    return token


# ------------------ Add Product ------------------ #

def add_product_to_site(token: str, product: dict):
    headers = {"Authorization": f"Bearer {token}"}

    resp = requests.post(
        f"{BASE_URL}/add-product",
        json=product,
        headers=headers,
        timeout=10
    )
    resp.raise_for_status()

    data = resp.json()
    if data.get("error"):
        raise RuntimeError(f"Add product failed: {data.get('message')}")

    return data


# ------------------ Main Program ------------------ #

def main():
    if not EMAIL or not PASSWORD:
        print("Please set EMAIL and PASSWORD in your environment.", file=sys.stderr)
        sys.exit(1)

    # Get barcode input
    barcode = input("Enter barcode: ").strip()
    if not barcode:
        print("No barcode entered.", file=sys.stderr)
        sys.exit(1)

    # Load DB
    products = load_products()

    if barcode not in products:
        print("Product not found in local database.")
        sys.exit(0)

    product_data = products[barcode]

    # Convert to backend expected format
    product_payload = {
        "product_name": product_data["product_name"],
        "Manufacturer": product_data["manufacturer"],
        "Price": float(product_data["price"]),
        "Quantity": 1,
        "weight": float(product_data["weight"])
    }

    try:
        # Login and send data
        token = get_access_token(EMAIL, PASSWORD)
        result = add_product_to_site(token, product_payload)

        print("Product added successfully!")
        print("Message:", result.get("message"))
        print("Product:", result.get("product"))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
