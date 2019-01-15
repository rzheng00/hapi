'use strict';

const Hapi = require('hapi');

const Inert = require('inert');
const Bcrypt = require('bcryptjs');
const Auth = require('hapi-auth-basic');

const users = {
    john: {
        username: 'john',
        password: '$2a$10$.lMd/iFtJJjq0xCapEH0ueKIel.z3CYjoTF6a//jZvZ4z/KAAat1K',   // 'test123'
        name: 'John Doe',
        id: '2133d32a'
    },

    dan: {
        username: 'dan',
        password: '$2a$10$ULw9qFfQRAZsSQy7nuh7O.c1fcnXtiybt7jrLBnh3pynRkDG40LaS',   // 'secret'
        name: 'Dan Johnson',
        id: '2133d32b'
    }
};

const validate = async (request, username, password) => {
    console.log('cred: ', username, password);

    const user = users[username];
    if (!user) {
        return { credentials: null, isValid: false };
    }
    console.log('found the user',password, user.password);

    const isValid = await Bcrypt.compareSync(password, user.password);
    const credentials = { id: user.id, name: user.name };

    return { isValid, credentials };
};

const server = Hapi.server({
    port: 3001,
    host: 'localhost'
});



server.route({
    method: 'GET',
    path: '/staticPage',
    handler: (request, h) => {

        return h.file('index.html');
    }
});



const init = async () => {
    await server.register(Inert);
    await server.register(Auth);
    server.auth.strategy('simple', 'basic', { validate });
    server.auth.default('simple');

    server.state('data', {
        ttl: null,
        isSecure: true,
        isHttpOnly: true,
        encoding: 'base64json',
        clearInvalid: false, // remove invalid cookies
        strictHeader: true // don't allow violations of RFC 6265
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
    
            return 'Hello, world!';
        }
    });

    server.route({
        method: 'GET',
        path: '/staticPageWithAuth',
        options: {
            auth: 'simple'
        },
        handler: (request, h) => {
    
            return h.file('index.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/cacheable/{ttl?}',
        options: {
            auth: 'simple',
            cache: {
                expiresIn: 30*1000,
                privacy: 'private'
            }
        },
        handler: (request, h) => {
            // const response = h.response({ be: 'hapi1' });
            const response = h.file('cachable.html');
            h.state('data',{firstVisit: false, loggedIn: true});
            if (request.params.ttl) {
                response.ttl(request.params.ttl);
            }

            return response;

        }
    });

    await server.start();
    console.log(`Server running at: ${server.info.uri}`);

    console.log('test ', Bcrypt.hashSync('test123',Bcrypt.genSaltSync(10)));
    console.log('secret ', Bcrypt.hashSync('secret',Bcrypt.genSaltSync(10)));
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();