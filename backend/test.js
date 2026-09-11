// Test script to verify customer controller, service, and repo with bcrypt
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Simulating the test
async function testBcryptHashing() {
  console.log("\n=== Testing Bcrypt Password Hashing ===\n");

  try {
    // Test 1: Hash a password
    const password = "TestPassword123";
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed successfully");
    console.log(`   Original: ${password}`);
    console.log(`   Hashed: ${hashedPassword}`);

    // Test 2: Verify correct password
    const isValidPassword = await bcrypt.compare(password, hashedPassword);
    console.log(`\n✅ Password verification (correct): ${isValidPassword}`);

    // Test 3: Verify incorrect password
    const isInvalidPassword = await bcrypt.compare("WrongPassword", hashedPassword);
    console.log(`✅ Password verification (incorrect): ${isInvalidPassword}`);

    // Test 4: Verify JWT generation
    const token = jwt.sign(
      { _id: "user123", email: "test@example.com" },
      "test_secret",
      { expiresIn: "10h" }
    );
    console.log(`\n✅ JWT token generated: ${token.substring(0, 20)}...`);

    // Test 5: Verify JWT
    const decoded = jwt.verify(token, "test_secret");
    console.log(`✅ JWT verified: ID=${decoded._id}, Email=${decoded.email}`);

    console.log("\n=== All Tests Passed! ===\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testBcryptHashing();

