let cart = JSON.parse(localStorage.getItem('cart') || '[]');

document.addEventListener('DOMContentLoaded', async () => {
    // Theme Initialization
    initTheme();

    const grid = document.getElementById('products-grid');
    if (grid) {
        fetchProducts();
        // Clear direct purchase data if we are back on home
        localStorage.removeItem('buyNowItem');
    }
    updateCartIcon();
    checkAuthState();
});

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update all toggles on page
    const toggles = document.querySelectorAll('.theme-switch input');
    toggles.forEach(t => t.checked = (newTheme === 'dark'));
}

async function checkAuthState() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    try {
        const auth = await fetch('/api/check-auth', { credentials: 'include' }).then(res => res.json());

        // Admin link removed from menu (accessible via footer)
        let adminHtml = '';

        const currentTheme = localStorage.getItem('theme') || 'light';
        const isChecked = currentTheme === 'dark' ? 'checked' : '';

        const themeHtml = `
            <div class="theme-switch-wrapper">
                <label class="theme-switch" for="theme-checkbox">
                    <input type="checkbox" id="theme-checkbox" onchange="toggleTheme()" ${isChecked} />
                    <div class="slider round"></div>
                </label>
            </div>
        `;

        if (auth) {
            nav.innerHTML = `
                ${themeHtml}
                <button class="cart-btn" onclick="toggleCart()">🛒 Cart <span id="cart-count">0</span></button>
                <a href="index.html">Home</a>
                <a href="orders.html">History</a>
                ${adminHtml}
                <a href="#" onclick="logout()">Logout (${auth.email.split('@')[0] || 'Owner'})</a>
            `;
        } else {
            nav.innerHTML = `
                ${themeHtml}
                <button class="cart-btn" onclick="toggleCart()">🛒 Cart <span id="cart-count">0</span></button>
                <a href="index.html">Home</a>
                <a href="#" onclick="promptAdmin()">Admin</a>
                <a href="login.html">Login</a>
            `;
        }
        updateCartIcon();
    } catch (err) { }
}

async function promptAdmin() {
    const pin = prompt("Enter Admin Password:");
    if (!pin) return;

    try {
        const res = await fetch('/api/admin-login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pin })
        });

        if (res.ok) {
            window.location.href = 'admin.html';
        } else {
            alert('Incorrect Admin Password');
        }
    } catch (err) {
        alert('Error connecting to server');
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.reload();
}

async function fetchProducts() {
    const grid = document.getElementById('products-grid');

    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        if (products.length === 0) {
            grid.innerHTML = '<div style="text-align:center; grid-column: 1/-1; padding: 2rem;">No products found.</div>';
            return;
        }

        // --- Premium Sorting Logic ---
        // Order: Powder -> Oil -> Everything else
        const sortedProducts = products.sort((a, b) => {
            const order = { 'powder': 1, 'oil': 2 };
            const catA = (a.category || '').toLowerCase();
            const catB = (b.category || '').toLowerCase();

            const valA = order[catA] || 99;
            const valB = order[catB] || 99;

            return valA - valB;
        });

        grid.innerHTML = sortedProducts.map(product => {
            if (product.active === false) return '';

            let badge = '';
            if (product.saleType === 'offer') {
                badge = '<div class="sale-badge sliding-badge">OFFER</div>';
            } else if (product.saleType === 'flash deals') {
                badge = '<div class="sale-badge sliding-badge">FLASH DEAL</div>';
            }

            return `
                <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
                    <div class="badge-container">${badge}</div>
                    <div class="product-image">
                        ${product.image ? `<img src="${product.image}" alt="${product.name}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">` : '<span>No Image</span>'}
                    </div>
                    <div class="product-info">
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: 1px;">${product.category || 'Herbals'}</span>
                        <h3 class="product-name">${escapeHtml(product.name)}</h3>
                        <div class="product-footer">
                            <span class="product-price">Rs. ${parseFloat(product.price).toLocaleString()}</span>
                        </div>
                        <p style="margin-top:0.8rem; font-size:0.85rem; color:var(--accent); font-weight:700; text-transform:uppercase; letter-spacing:1px;">View Nature's Gift →</p>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error fetching products:', err);
        grid.innerHTML = '<div style="text-align:center; grid-column: 1/-1; color: red;">Failed to load products.</div>';
    }
}

function updateCartIcon() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = count;
}

function addToCartGlobal(item, silent = false) {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(c => c.id === item.id);
    const addedQty = parseInt(item.qty) || 1;

    if (existing) {
        existing.qty = (parseInt(existing.qty) || 0) + addedQty;
    } else {
        item.qty = addedQty;
        cart.push(item);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartIcon();
    syncCartWithServer();
    if (!silent) {
        alert(`Botanical update: ${item.name} added to your basket.`);
    }
}

async function syncCartWithServer() {
    const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
    try {
        await fetch('/api/sync-cart', {
            method: 'POST',
            credentials: 'include', // Ensure cart sync sends cookie
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: cartData })
        });
    } catch (err) { }
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    if (modal.style.display === 'block') {
        modal.style.display = 'none';
    } else {
        renderCartItems();
        modal.style.display = 'block';
    }
}

function renderCartItems() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-amount');
    if (!list || !totalEl) return;

    cart = JSON.parse(localStorage.getItem('cart') || '[]');

    if (cart.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-muted);">Your botanical basket is empty.</p>';
        totalEl.innerText = '0';
        return;
    }

    let total = 0;
    list.innerHTML = cart.map((item, index) => {
        total += item.price * item.qty;
        return `
            <div class="cart-item">
                <img src="${item.image || 'https://placehold.co/60x60'}" alt="${item.name}">
                <div>
                    <div style="font-weight:700; font-size:1rem; color:var(--primary);">${item.name}</div>
                    <div class="remove-item" onclick="removeFromCart(${index})" style="font-weight:600; text-decoration:underline;">Discard</div>
                </div>
                <input type="number" class="qty-input" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)" style="border:2px solid var(--border); border-radius:5px; padding:2px 5px; width:50px;">
                <div style="font-weight:800; color:var(--secondary);">Rs. ${(item.price * item.qty).toLocaleString()}</div>
            </div>
        `;
    }).join('');
    totalEl.innerText = total.toLocaleString();
}

function updateQty(index, val) {
    cart[index].qty = parseInt(val);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCartItems();
    updateCartIcon();
    syncCartWithServer();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCartItems();
    updateCartIcon();
    syncCartWithServer();
}

function proceedToCheckout() {
    if (cart.length === 0) return alert('Your cart is empty!');
    window.location.href = 'checkout.html';
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
