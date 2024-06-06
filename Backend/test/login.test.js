
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../index.js')

const { expect } = chai;

chai.use(chaiHttp);

describe('Endpoint de Login', () => {
    it('Deve retornar dados do usuário ao fazer login com sucesso', (done) => {
        chai.request(app)
            .post('/login')
            .send({ email: 'exemplo@exemplo.com', senha: 'senha' })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('object');
                expect(res.body).to.have.property('uid');
                expect(res.body).to.have.property('email');
                done();
            });
    });

    it('Deve retornar uma mensagem de erro para credenciais inválidas', (done) => {
        chai.request(app)
            .post('/login')
            .send({ email: 'email@invalido.com', senha: 'senha_invalida' })
            .end((err, res) => {
                expect(res).to.have.status(401);
                expect(res.body).to.have.property('message').that.equals('Credenciais inválidas. Por favor, verifique seu e-mail e senha.');
                done();
            });
    });


});
