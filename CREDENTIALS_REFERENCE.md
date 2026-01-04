# WebXPay Credentials - Quick Reference

## ✅ Your Credentials (Now Active)

### Public Key
```
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC87AJqWv2BySAS07B+SCLqbJyp
OSW/QR8/3I1GNmkysLrCSGSDzNpP3t8hRETJhtyRMQc0Su0TJ0yepV1H/foXh/+X
FlLXvI0FGU7u0cWCM/43edyYDw+H1llEDt0CAhAFFIkYL8xzu0xpQChd3VASukDa
jd16I0bTLlBMwTF8kwIDAQAB
-----END PUBLIC KEY-----
```

### Secret Key
```
d646ea3b-8056-42cd-8c3f-890245ada76f
```

---

## 📍 Where These Are Used

### 1. **Public Key** (Used in 2 places)

#### Location 1: `server.js` - Line 22-27
**Purpose**: Encrypts payment data before sending to WebXPay
```javascript
const WEBXPAY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC87AJqWv2BySAS07B+SCLqbJyp
...
-----END PUBLIC KEY-----`;
```

#### Location 2: `server.js` - Line 157 (Payment Response Handler)
**Purpose**: Verifies payment signature when WebXPay sends confirmation back
```javascript
const verificationKey = new NodeRSA(WEBXPAY_PUBLIC_KEY);
verificationKey.setOptions({ signingScheme: 'pss-sha1' });
const isValid = verificationKey.verify(payment, signature);
```

---

### 2. **Secret Key** (Used in 2 places)

#### Location 1: `server.js` - Line 28
**Purpose**: Stored as constant for form submission
```javascript
const WEBXPAY_SECRET_KEY = "d646ea3b-8056-42cd-8c3f-890245ada76f";
```

#### Location 2: `server.js` - Line 295 (Place Order Route)
**Purpose**: Sent to WebXPay in the payment form as authentication
```javascript
webxpay = {
    url: 'https://webxpay.com/index.php?route=checkout/billing',
    payment: encryptedData,
    secret_key: WEBXPAY_SECRET_KEY,  // ← Sent here
    order_id: orderId,
    custom_fields: Buffer.from('MaHerbals_Order|New_Order|Direct|Web').toString('base64')
};
```

#### Location 3: `checkout.html` - Line 524
**Purpose**: Included in the hidden form that submits to WebXPay
```javascript
secret_key: data.webxpay.secret_key,  // ← From server response
```

---

## 🔐 Security Flow

### When Customer Pays:
1. **Server encrypts** `order_id|amount` using **Public Key** → Creates encrypted payment string
2. **Server sends** encrypted payment + **Secret Key** to WebXPay via form
3. **WebXPay validates** Secret Key to confirm it's your store
4. **WebXPay decrypts** payment data using their private key
5. **Customer pays** on WebXPay's secure page

### When Payment Completes:
1. **WebXPay sends** encrypted confirmation back to your server
2. **Server verifies** signature using **Public Key**
3. **If valid** → Order confirmed, cart cleared
4. **If invalid** → Payment rejected, customer notified

---

## ⚠️ NEVER Share These

- ❌ Don't commit to public GitHub
- ❌ Don't share in screenshots
- ❌ Don't send via unencrypted email
- ✅ Keep in server-side code only
- ✅ Use environment variables in production

---

## 🧪 Test Your Integration

1. Add a product to cart
2. Go to checkout
3. Fill delivery details
4. Select "DIGITAL" payment
5. Click "Confirm Order"
6. **Expected**: Redirect to WebXPay payment page
7. Enter test card (get from WebXPay support)
8. **Expected**: Return to your site with "Payment Successful" message

**Server logs should show:**
```
Encrypting payment for order [ID], total: [Amount]
✅ Payment verified successfully
```

---

**Status**: ✅ Credentials are now active in your server!
**Server**: Running on http://localhost:3000
