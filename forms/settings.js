const settings = {
    cookieSecret: process.env.COOKIE_SECRET || 'your-secret-key-change-this',

    cookieOptions: {
        httpOnly: true,
        secure: false, // set to true in production with HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },

    authCookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 // 1 godzina
    },

    getAppSettings: (req) => {
        return {
            theme: req.cookies.theme || 'light',
            cookiesAccepted: req.cookies.cookiesAccepted === 'true'
        };
    },

    settingsLocals: (req, res, next) => {
        res.locals.theme = req.cookies.theme || 'light';
        res.locals.cookiesAccepted = req.cookies.cookiesAccepted === 'true';
        next();
    },
    
    themeToggle: (req, res) => {
        const currentTheme = req.cookies.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        res.cookie('theme', newTheme, { ...settings.cookieOptions, maxAge: 60 * 60 * 1000 }); // 1 godzina dla theme

        const next = req.query.next;
        res.redirect(next === 'back' ? (req.get('referer') || '/') : (next || '/'));
    },

    acceptCookies: (req, res) => {
        res.cookie('cookiesAccepted', 'true', { maxAge: 60 * 60 * 1000 }); // 1 hour
        const next = req.query.next;
        if (next === 'back') {
            res.redirect(req.get('referer') || '/');
        } else {
            res.redirect(next || '/');
        }
    },
    declineCookies: (req, res) => {
        res.clearCookie('cookiesAccepted');
        const next = req.query.next;
        if (next === 'back') {
            res.redirect(req.get('referer') || '/');
        } else {
            res.redirect(next || '/');
        }
    },
    manageCookies: (req, res) => {
        // Render a manage cookies page or redirect
        res.redirect('/welcome'); // or render a settings page
    }
};

export default settings;