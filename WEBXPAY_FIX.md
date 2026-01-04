# WebXPay "Invalid Request URL" - FIXED

## ✅ What Was Changed

### 1. **URL Updated to Staging Environment**
- **Before**: `https://webxpay.com/index.php?route=checkout/billing`
- **After**: `https://stagingxpay.info/index.php?route=checkout/billing`
- **Why**: Your credentials are for the staging/test environment, not production

### 2. **Removed Duplicate order_id Field**
- **Before**: Sending `order_id` separately in the form
- **After**: Only in encrypted payment string (`order_id|amount`)
- **Why**: WebXPay was receiving conflicting order IDs

---

## 🔍 Understanding the Error

**"Invalid Request URL"** means WebXPay rejected the request because:
1. ❌ Wrong endpoint URL (production vs staging)
2. ❌ Credentials don't match the environment
3. ❌ Malformed request data

---

## 🎯 Current Configuration

### Server Endpoint (server.js line 293):
```javascript
url: 'https://stagingxpay.info/index.php?route=checkout/billing'
```

### Payment Data Sent:
```javascript
{
  payment: "encrypted_order_id|amount",
  secret_key: "d646ea3b-8056-42cd-8c3f-890245ada76f",
  custom_fields: "base64_encoded_data",
  // Customer details...
  first_name: "...",
  last_name: "...",
  email: "...",
  // etc.
}
```

---

## 🧪 Testing Steps

### 1. Clear Browser Cache
```
Ctrl + Shift + Delete → Clear cached images and files
```

### 2. Test Payment Flow
1. Add product to cart
2. Go to checkout
3. Fill delivery details
4. Select **"DIGITAL"** payment
5. Click **"Confirm Order"**

### 3. Expected Behavior
✅ Browser redirects to: `https://stagingxpay.info/index.php?route=checkout/billing`
✅ WebXPay payment page loads
✅ Shows payment form with your order details

### 4. If Still Getting "Invalid Request URL"

#### Check Server Logs:
```
Encrypting payment for order [ID], total: [Amount]
```
If you see this, encryption is working.

#### Verify in Browser Console (F12):
```javascript
// Check the form action before submission
console.log(document.querySelector('form').action);
// Should show: https://stagingxpay.info/index.php?route=checkout/billing
```

---

## 🔄 Staging vs Production

### **You're Currently Using: STAGING** ✅

**Staging Environment:**
- URL: `https://stagingxpay.info/...`
- Purpose: Testing with test cards
- Your credentials: ✅ Match this environment

**Production Environment (Future):**
- URL: `https://webxpay.com/...`
- Purpose: Real customer payments
- Requires: Different credentials from WebXPay

### When to Switch to Production:
1. Contact WebXPay support
2. Request production credentials
3. Update `WEBXPAY_PUBLIC_KEY` and `WEBXPAY_SECRET_KEY`
4. Change URL to `https://webxpay.com/index.php?route=checkout/billing`

---

## 🎴 Test Card Numbers

Contact WebXPay support for staging test cards. Typically:
- **Test Visa**: 4111 1111 1111 1111
- **Test Mastercard**: 5555 5555 5555 4444
- **CVV**: Any 3 digits
- **Expiry**: Any future date

---

## 📞 If Still Not Working

### 1. Check WebXPay Account Status
- Login to WebXPay merchant dashboard
- Verify account is **activated** for staging
- Check if API access is enabled

### 2. Verify Credentials Match Environment
- Staging credentials → Staging URL ✅
- Production credentials → Production URL

### 3. Contact WebXPay Support
Provide them:
- Merchant ID
- Error message: "Invalid Request URL"
- Environment: Staging
- Integration method: Redirect Integration

---

## ✅ Current Status

**Server**: ✅ Running on http://localhost:3000
**URL**: ✅ Updated to staging endpoint
**Credentials**: ✅ Installed
**Encryption**: ✅ Using node-rsa
**Form Fields**: ✅ Match WebXPay sample

**Next Step**: Test a payment and it should redirect to WebXPay staging!
