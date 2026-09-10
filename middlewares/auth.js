const isLogin = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/');
        }
        next();
    } catch (error) {
        console.error(error.message);
        return res.redirect('/');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session && req.session.user) {
            return res.redirect('/dashboard');
        }
        next();
    } catch (error) {
        console.error(error.message);
        next();
    }
};

module.exports = {
    isLogin,
    isLogout
};