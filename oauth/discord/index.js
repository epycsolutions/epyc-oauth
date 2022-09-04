const axios = require('axios');

let oAuthConfig = {
    host: 'localhost',
    port: 3000,
    ssl: false,
    withCredentials: true,
    path: '/discord',
    headers: {}
};

let uri = generateURI();


login = async (redirectTo, callback) => {
    return new Promise((resolve, reject) => {
        axios.post(`${ uri }/login`, {
            redirectTo: redirectTo || null
        }, {
            withCredentials: oAuthConfig.withCredentials,
            headers: oAuthConfig.headers
        }).then((response) => {
            callback(response);
            resolve();
        }).catch((error) => reject(error));
    });
}

disconnect = async (callback) => {
    return new Promise((resolve, reject) => {
        axios.post(`${ uri }/disconnect`, {}, {
            withCredentials: oAuthConfig.withCredentials,
            headers: oAuthConfig.headers
        }).then((response) => {
            callback(response);
            resolve();
        }).catch((error) => reject(error));
    });
}

module.exports.login = login;
module.exports.disconnect = disconnect;


initClient = (app, oAuthConfig) => {
    if(oAuthConfig) this.oAuthConfig = oAuthConfig;
    uri = generateURI();

    app.config.globalProperties.$login = login;
    app.config.globalProperties.$disconnect = disconnect;
}

module.exports.initClient = initClient;


generateURI = () => {
    return `http${ oAuthConfig.ssl ? 's' : '' }//${ oAuthConfig.host }${ [80, 8080].includes(oAuthConfig.port) ? '' : `${ oAuthConfig.port }${ oAuthConfig.path }` }`;
}


class Server {
    constructor(app, apiHost, webHost, path) {
        this.apiHost = apiHost;
        this.path = path || '/discord';

        app.post(`${ oAuthConfig.path }/login`, (req, res) => {
            const { redirectTo } = req.body;

            if(!req.isAuthenticated()) {
                return res.status(200).send({
                    isAuthenticated: false,
                    redirect: `${ this.apiHost }${ this.path }${ redirectTo ? `?redirectTo=${ redirectTo }` : '' }`
                });
            }

            if(!req.user) {
                return res.status(200).send({
                    isAuthenticated: false,
                    redirect: `${ this.apiHost }${ this.path }${ redirectTo ? `?redirectTo=${ redirectTo }` : '' }`
                });
            }

            res.status(200).send({
                isAuthenticated: true,
                user: req.user
            });
        });

        app.get(this.path, (req, res, next) => {
            req.session.redirectTo = req.query['redirectTo'];
            app.passport.authenticate('discord', { scope: [ 'identify', 'email', 'guilds' ], prompt: 'none' })(req, res, next);
        });

        app.get(`${ this.path }/callback`, app.passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
            const redirectTo = req.session.redirectTo || '';
            delete req.session.redirectTo;

            res.redirect(`${ webHost }${ redirectTo }`);
        });

        app.post(`${ this.path }/disconnect`, (req, res) => {
            req.logout();
            res.send();
        });
    }
}

module.exports.Server = Server;
