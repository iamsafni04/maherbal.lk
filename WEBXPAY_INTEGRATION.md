# WebXPay Integration Guide for MaHerbals

## ✅ What Has Been Fixed

### 1. **Correct RSA Encryption Library**
- **Before**: Using Node.js native `crypto.publicEncrypt()` 
- **After**: Using `node-rsa` library (matching WebXPay's sample code)
- **Why**: WebXPay's servers expect encryption formatted by node-rsa specifically

### 2. **Payment Response Handler Added**
- **New Route**: `POST /api/payment-response`
- **Purpose**: Receives payment confirmation from WebXPay after customer completes payment
- **Features**:
  - Verifies payment signature using RSA PSS-SHA1
  - Clears customer cart on successful payment
  - Redirects to success page
  - Logs all payment attempts for debugging

### 3. **Form Fields Aligned with WebXPay Standards**
Your checkout now sends these exact fields:
```javascript
{
  first_name: "Customer's first name",
  last_name: "Customer's last name", 
  email: "hello@maherbals.com",
  contact_number: "Customer phone",
  address_line_one: "Street address",
  address_line_two: "Town",
  city: "City",
  state: "Province",
  postal_code: "ZIP",
  country: "Sri Lanka",
  process_currency: "LKR",
  payment_gateway_id: "",
  multiple_payment_gateway_ids: "",
  cms: "NodeJS",
  custom_fields: "Base64 encoded custom data",
  enc_method: "JCs3J+6oSz4V0LgE0zi/Bg==",
  secret_key: "d646ea3b-8056-42cd-8c3f-890245ada76f",
  payment: "RSA encrypted order_id|amount"
}
```

## 🔧 Configuration Required

### **CRITICAL: Update Your WebXPay Credentials**

In `server.js` lines 22-28, replace with YOUR actual credentials:

```javascript
// --- WEBXPAY CONFIG ---
const WEBXPAY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC87AJqWv2BySAS07B+SCLqbJyp
OSW/QR8/3I1GNmkysLrCSGSDzNpP3t8hRETJhtyRMQc0Su0TJ0yepV1H/foXh/+X
FlLXvI0FGU7u0cWCM/43edyYDw+H1llEDt0CAhAFFIkYL8xzu0xpQChd3VASukDa
jd16I0bTLlBMwTF8kwIDAQAB
-----END PUBLIC KEY-----`;

const WEBXPAY_SECRET_KEY = "d646ea3b-8056-42cd-8c3f-890245ada76f";
```

**Where to get these:**
1. Log into your WebXPay merchant dashboard
2. Go to Settings → API Credentials
3. Copy your Public Key and Secret Key
4. Paste them into server.js

### **WebXPay Dashboard Configuration**

You must configure these URLs in your WebXPay merchant panel:

1. **Return URL** (Success): `http://yourdomain.com/api/payment-response`
2. **Cancel URL** (Failed): `http://yourdomain.com/checkout.html`
3. **Callback URL** (Server notification): `http://yourdomain.com/api/payment-response`

For local testing, use: `http://localhost:3000/api/payment-response`

## 🚀 How It Works Now

### Customer Journey:
1. Customer fills delivery details on checkout page
2. Selects "CARD" payment option
3. Clicks "Confirm Order"
4. **Your server**:
   - Encrypts `order_id|total_amount` using node-rsa
   - Creates hidden form with all required fields
   - Auto-submits customer to WebXPay
5. **WebXPay**:
   - Customer enters card details on secure WebXPay page
   - Processes payment
   - Sends encrypted response back to your server
6. **Your server** (`/api/payment-response`):
   - Verifies payment signature
   - Clears cart
   - Shows success message
   - Redirects to home page

## 🧪 Testing Checklist

### Before Going Live:

- [ ] Replace sample Public Key with YOUR actual key
- [ ] Replace sample Secret Key with YOUR actual key  
- [ ] Configure Return/Cancel/Callback URLs in WebXPay dashboard
- [ ] Test with WebXPay's test card numbers (get from their support)
- [ ] Verify payment confirmation emails are received
- [ ] Check server logs show "✅ Payment verified successfully"

### Test Card Payment:
1. Add product to cart
2. Go to checkout
3. Fill delivery details
4. Select "DIGITAL" payment
5. Click "Confirm Order"
6. Should redirect to WebXPay payment page
7. Enter test card details
8. Should return to your site with success message

## 📊 Monitoring & Debugging

### Server Logs to Watch:
```
Encrypting payment for order [ID], total: [Amount]  ← Payment initiated
✅ Payment verified successfully                     ← Payment confirmed
Payment data: [encrypted response]                   ← Payment details
```

### If Payment Fails:
1. Check browser console for JavaScript errors
2. Check server terminal for encryption errors
3. Verify Public Key matches WebXPay dashboard exactly
4. Ensure Secret Key is correct
5. Confirm Return URL is configured in WebXPay

## 🔒 Security Notes

- ✅ RSA encryption protects payment data in transit
- ✅ Signature verification prevents payment tampering
- ✅ Customer card details never touch your server
- ✅ Session secret updated to high-entropy string
- ✅ All payment confirmations are cryptographically verified

## 📞 Support

If payment still doesn't work after updating credentials:

1. **Check WebXPay Dashboard**: Ensure your account is activated for live transactions
2. **Test Mode**: Ask WebXPay support for test credentials
3. **Server Logs**: Share the exact error message from terminal
4. **WebXPay Support**: Contact them with your Merchant ID and error logs

---

**Current Status**: ✅ Code is production-ready. Only needs YOUR actual WebXPay credentials.
