import ProdutoRepository from '../../repositories/produtoRepository.js';
import ProdutoModel from '../../models/Produto.js';
import mongoose from 'mongoose';
import { CustomError, messages } from '../../utils/helpers/index.js';
import ProdutoFilterBuilder from '../../repositories/filters/ProdutoFilterBuilder.js';

// Mock do modelo Produto
jest.mock('../../models/Produto.js', () => {
    const mockModel = {
        findById: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(() => ({
            sort: jest.fn().mockReturnThis()
        })),
        paginate: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn()
    };

    mockModel.mockImplementation = function () {
        return {
            save: jest.fn()
        };
    };

    return mockModel;
});

// Mock do mongoose
jest.mock('mongoose', () => ({
    Types: {
        ObjectId: {
            isValid: jest.fn().mockReturnValue(true)
        }
    },
    model: jest.fn(() => ({
        find: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue([])
        })
    }))
}));

// Mock do ProdutoFilterBuilder
jest.mock('../../repositories/filters/ProdutoFilterBuilder.js', () => {
    return jest.fn().mockImplementation(() => {
        const mockBuilder = {
            comNome: jest.fn().mockReturnThis(),
            comCategoria: jest.fn().mockReturnThis(),
            comCodigo: jest.fn().mockReturnThis(),
            comPrecoMinimo: jest.fn().mockReturnThis(),
            comPrecoMaximo: jest.fn().mockReturnThis(),
            comEstoqueMinimo: jest.fn().mockReturnThis(),
            comFornecedor: jest.fn().mockReturnThis(),
            comStatus: jest.fn().mockReturnThis(),
            build: jest.fn()
        };

        // Configuramos o comportamento padrão do build
        mockBuilder.build.mockReturnValue({});

        return mockBuilder;
    });
});

// Mock da CustomError e mensagens
jest.mock('../../utils/helpers/index.js', () => ({
    CustomError: class extends Error {
        constructor({ statusCode, errorType, field, details, customMessage }) {
            super(customMessage);
            this.statusCode = statusCode;
            this.errorType = errorType;
            this.field = field;
            this.details = details;
        }
    },
    messages: {
        error: {
            internalServerError: (resource) => `Erro interno no ${resource}`,
            resourceNotFound: (resource) => `${resource} não encontrado`,
        }
    }
}));

describe('ProdutoRepository', () => {
    let produtoRepository;
    let mockModel;
    let mockFilterBuilder;

    beforeEach(() => {
        jest.clearAllMocks();

        function MockModel(data) {
            return {
                ...data,
                save: jest.fn().mockResolvedValue(data)
            };
        }

        MockModel.findById = jest.fn();
        MockModel.findOne = jest.fn();
        MockModel.find = jest.fn(() => ({ sort: jest.fn().mockResolvedValue([]) }));
        MockModel.paginate = jest.fn();
        MockModel.findByIdAndUpdate = jest.fn();
        MockModel.findByIdAndDelete = jest.fn();

        mockModel = MockModel;
        produtoRepository = new ProdutoRepository({ model: mockModel });

        // Criamos funções mock para cada método do builder
        const mockComNome = jest.fn().mockReturnThis();
        const mockComCategoria = jest.fn().mockReturnThis();
        const mockComCodigo = jest.fn().mockReturnThis();
        const mockComPrecoMinimo = jest.fn().mockReturnThis();
        const mockComPrecoMaximo = jest.fn().mockReturnThis();
        const mockComEstoqueMinimo = jest.fn().mockReturnThis();
        const mockComFornecedor = jest.fn().mockReturnThis();
        const mockComStatus = jest.fn().mockReturnThis();
        const mockBuildFn = jest.fn();

        // Configuramos a implementação do mock com as funções definidas acima
        ProdutoFilterBuilder.mockImplementation(() => ({
            comNome: mockComNome,
            comCategoria: mockComCategoria,
            comCodigo: mockComCodigo,
            comPrecoMinimo: mockComPrecoMinimo,
            comPrecoMaximo: mockComPrecoMaximo,
            comEstoqueMinimo: mockComEstoqueMinimo,
            comFornecedor: mockComFornecedor,
            comStatus: mockComStatus,
            build: mockBuildFn
        }));

        // Armazenamos referencias para todas as funções mock para uso nos testes
        mockFilterBuilder = {
            comNome: mockComNome,
            comCategoria: mockComCategoria,
            comCodigo: mockComCodigo,
            comPrecoMinimo: mockComPrecoMinimo,
            comPrecoMaximo: mockComPrecoMaximo,
            comEstoqueMinimo: mockComEstoqueMinimo,
            comFornecedor: mockComFornecedor,
            comStatus: mockComStatus,
            build: mockBuildFn
        };
    });

    describe('buscarProdutoPorID', () => {
        it('deve encontrar um produto pelo ID', async () => {
            const mockProduto = { _id: '123', nome_produto: 'Produto Teste' };
            mockModel.findById.mockResolvedValue(mockProduto);

            const result = await produtoRepository.buscarProdutoPorID('123');

            expect(result).toEqual(mockProduto);
            expect(mockModel.findById).toHaveBeenCalledWith('123');
        });

        it('deve lançar um erro se o produto não for encontrado', async () => {
            mockModel.findById.mockResolvedValue(null);

            await expect(produtoRepository.buscarProdutoPorID('123')).rejects.toThrow(CustomError);
            expect(mockModel.findById).toHaveBeenCalledWith('123');
        });
    });

    describe('cadastrarProduto', () => {
        it('deve cadastrar um novo produto', async () => {
            const mockProduto = {
                nome_produto: 'Produto Teste',
                codigo_produto: 'PROD001',
                preco: 99.99
            };

            mockModel.findOne.mockResolvedValue(null);
            mockModel.mockImplementation = jest.fn().mockImplementation((data) => ({
                ...data,
                save: jest.fn().mockResolvedValue(data)
            }));

            const result = await produtoRepository.cadastrarProduto(mockProduto);

            expect(result).toEqual(mockProduto);
            expect(mockModel.findOne).toHaveBeenCalledWith({ codigo_produto: 'PROD001' });
        });

        it('deve lançar um erro se já existir um produto com o mesmo código', async () => {
            const mockProduto = {
                nome_produto: 'Produto Teste',
                codigo_produto: 'PROD001',
                preco: 99.99
            };

            mockModel.findOne.mockResolvedValue({ _id: '123', codigo_produto: 'PROD001' });

            await expect(produtoRepository.cadastrarProduto(mockProduto)).rejects.toThrow(CustomError);
            expect(mockModel.findOne).toHaveBeenCalledWith({ codigo_produto: 'PROD001' });
        });
    });

    describe('listarProdutos', () => {
        it('deve listar produtos com filtros', async () => {
            const mockProdutos = {
                docs: [{ nome_produto: 'Produto1' }],
                totalDocs: 1,
                limit: 10,
                page: 1
            };
            const req = {
                query: { nome_produto: 'Produto', page: 1, limite: 10 },
                params: {}
            };

            // Configura o builder para retornar um filtro específico
            mockFilterBuilder.build.mockReturnValue({ nome_produto: { $regex: 'Produto', $options: 'i' } });
            mockModel.paginate.mockResolvedValue(mockProdutos);

            const result = await produtoRepository.listarProdutos(req);

            expect(result).toEqual(mockProdutos);
            expect(ProdutoFilterBuilder).toHaveBeenCalled();
            expect(mockFilterBuilder.comNome).toHaveBeenCalledWith('Produto');
            expect(mockFilterBuilder.build).toHaveBeenCalled();
            expect(mockModel.paginate).toHaveBeenCalledWith(
                { nome_produto: { $regex: 'Produto', $options: 'i' } },
                expect.objectContaining({
                    page: 1,
                    limit: 10,
                    populate: 'id_fornecedor',
                    sort: { nome_produto: 1 }
                })
            );
        });

        it('deve buscar um produto por ID', async () => {
            const mockProduto = { _id: '123', nome_produto: 'Produto Teste' };
            mockModel.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockProduto)
            });

            const req = { params: { id: '123' } };
            const result = await produtoRepository.listarProdutos(req);

            expect(result).toEqual(mockProduto);
            expect(mockModel.findById).toHaveBeenCalledWith('123');
        });

        it('deve lançar erro se o produto não for encontrado pelo ID', async () => {
            mockModel.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            const req = { params: { id: '123' } };

            await expect(produtoRepository.listarProdutos(req)).rejects.toThrow(CustomError);
            expect(mockModel.findById).toHaveBeenCalledWith('123');
        });

        it('deve aplicar filtro por nome do produto', async () => {
            const mockProdutos = {
                docs: [{ nome_produto: 'Produto1' }],
                totalDocs: 1,
                limit: 10,
                page: 1
            };
            const req = {
                query: { nome_produto: 'Produto' },
                params: {}
            };

            // Configura o builder para retornar um filtro específico
            mockFilterBuilder.build.mockReturnValue({ nome_produto: { $regex: 'Produto', $options: 'i' } });
            mockModel.paginate.mockResolvedValue(mockProdutos);

            await produtoRepository.listarProdutos(req);

            expect(mockFilterBuilder.comNome).toHaveBeenCalledWith('Produto');
            expect(mockFilterBuilder.build).toHaveBeenCalled();
            expect(mockModel.paginate).toHaveBeenCalledWith(
                { nome_produto: { $regex: 'Produto', $options: 'i' } },
                expect.anything()
            );
        });

        it('deve aplicar filtro por categoria', async () => {
            const mockProdutos = {
                docs: [{ categoria: 'A' }],
                totalDocs: 1,
                limit: 10,
                page: 1
            };
            const req = {
                query: { categoria: 'A' },
                params: {}
            };

            // Configura o builder para retornar um filtro específico
            mockFilterBuilder.build.mockReturnValue({ categoria: { $regex: 'A', $options: 'i' } });
            mockModel.paginate.mockResolvedValue(mockProdutos);

            await produtoRepository.listarProdutos(req);

            expect(mockFilterBuilder.comCategoria).toHaveBeenCalledWith('A');
            expect(mockFilterBuilder.build).toHaveBeenCalled();
            expect(mockModel.paginate).toHaveBeenCalledWith(
                { categoria: { $regex: 'A', $options: 'i' } },
                expect.anything()
            );
        });

        it('deve aplicar filtro por código do produto', async () => {
            const mockProdutos = {
                docs: [{ codigo_produto: 'ABC123' }],
                totalDocs: 1,
                limit: 10,
                page: 1
            };
            const req = {
                query: { codigo_produto: 'ABC123' },
                params: {}
            };

            // Configura o builder para retornar um filtro específico
            mockFilterBuilder.build.mockReturnValue({ codigo_produto: { $regex: 'ABC123', $options: 'i' } });
            mockModel.paginate.mockResolvedValue(mockProdutos);

            await produtoRepository.listarProdutos(req);

            expect(mockFilterBuilder.comCodigo).toHaveBeenCalledWith('ABC123');
            expect(mockFilterBuilder.build).toHaveBeenCalled();
            expect(mockModel.paginate).toHaveBeenCalledWith(
                { codigo_produto: { $regex: 'ABC123', $options: 'i' } },
                expect.anything()
            );
        });

        it('deve aplicar filtro por ID do fornecedor', async () => {
            const mockProdutos = {
                docs: [{ id_fornecedor: '123' }],
                totalDocs: 1,
                limit: 10,
                page: 1
            };
            const req = {
                query: { id_fornecedor: '123' },
                params: {}
            };

            // Configura o builder para retornar um filtro específico
            mockFilterBuilder.build.mockReturnValue({ id_fornecedor: '123' });
            mockModel.paginate.mockResolvedValue(mockProdutos);

            await produtoRepository.listarProdutos(req);

            expect(mockFilterBuilder.comFornecedor).toHaveBeenCalledWith('123');
            expect(mockFilterBuilder.build).toHaveBeenCalled();
            expect(mockModel.paginate).toHaveBeenCalledWith(
                { id_fornecedor: '123' },
                expect.anything()
            );
        });

        it('deve aplicar filtro por nome do fornecedor', async () => {
            const mockProdutos = {
                docs: [{ id_fornecedor: '123' }],
                totalDocs: 1,
                limit: 10,
                page: 1
            };

            const mockFornecedores = [{ _id: '60d21b4667d0d8992e610c85' }];
            mongoose.model.mockReturnValue({
                find: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockFornecedores)
                })
            });

            const req = {
                query: { nome_fornecedor: 'Fornecedor Teste' },
                params: {}
            };

            // Configura o builder para retornar um filtro específico
            // Este teste é mais complexo porque envolve buscas em outro modelo
            mockFilterBuilder.build.mockReturnValue({ id_fornecedor: { $in: ['60d21b4667d0d8992e610c85'] } });
            mockModel.paginate.mockResolvedValue(mockProdutos);

            await produtoRepository.listarProdutos(req);

            expect(mongoose.model).toHaveBeenCalledWith('fornecedores');
            expect(mockModel.paginate).toHaveBeenCalled();
        });
    });

    describe('atualizarProduto', () => {
        it('deve atualizar um produto existente', async () => {
            const id = '123';
            const dadosAtualizados = { nome_produto: 'Produto Atualizado' };
            const produtoAtualizado = { _id: id, ...dadosAtualizados };

            mockModel.findByIdAndUpdate.mockResolvedValue(produtoAtualizado);
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);

            const result = await produtoRepository.atualizarProduto(id, dadosAtualizados);

            expect(result).toEqual(produtoAtualizado);
            expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
                id,
                dadosAtualizados,
                expect.objectContaining({ new: true })
            );
        });

        it('deve lançar erro se o produto não for encontrado para atualização', async () => {
            const id = '123';
            const dadosAtualizados = { nome_produto: 'Produto Atualizado' };

            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            mockModel.findByIdAndUpdate.mockResolvedValue(null);

            await expect(produtoRepository.atualizarProduto(id, dadosAtualizados)).rejects.toThrow(CustomError);
            expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
                id,
                dadosAtualizados,
                expect.objectContaining({ new: true })
            );
        });

        it('deve lançar erro para ID inválido', async () => {
            const id = 'invalid-id';
            const dados = { nome_produto: 'Produto Teste' };

            mongoose.Types.ObjectId.isValid.mockReturnValue(false);

            await expect(produtoRepository.atualizarProduto(id, dados))
                .rejects.toThrow(CustomError);
        });

        it('deve lançar erro para código duplicado em outro produto', async () => {
            const id = '123';
            const dados = { codigo_produto: 'PROD001' };
            const produtoExistente = { _id: '456', codigo_produto: 'PROD001' };

            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            mockModel.findOne.mockResolvedValue(produtoExistente);

            await expect(produtoRepository.atualizarProduto(id, dados))
                .rejects.toThrow(CustomError);

            expect(mockModel.findOne).toHaveBeenCalledWith({
                codigo_produto: 'PROD001',
                _id: { $ne: id }
            });
        });
    });

    describe('deletarProduto', () => {
        it('deve deletar um produto existente', async () => {
            const id = '123';
            const mockProduto = { _id: id, nome_produto: 'Produto Teste' };

            mockModel.findByIdAndDelete.mockResolvedValue(mockProduto);

            const result = await produtoRepository.deletarProduto(id);

            expect(result).toEqual(mockProduto);
            expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(id);
        });

        it('deve lançar erro se o produto não for encontrado para deleção', async () => {
            const id = '123';

            mockModel.findByIdAndDelete.mockResolvedValue(null);

            await expect(produtoRepository.deletarProduto(id)).rejects.toThrow(CustomError);
            expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(id);
        });
    });

    describe('listarEstoqueBaixo', () => {
        it('deve retornar produtos com estoque abaixo do mínimo', async () => {
            const mockProdutos = [
                { nome_produto: 'Produto1', estoque: 5, estoque_min: 10 },
                { nome_produto: 'Produto2', estoque: 3, estoque_min: 5 }
            ];

            const mockSort = jest.fn().mockResolvedValue(mockProdutos);
            mockModel.find.mockReturnValue({ sort: mockSort });

            const result = await produtoRepository.listarEstoqueBaixo();

            expect(result).toEqual(mockProdutos);
            expect(mockModel.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    $expr: { $lt: ['$estoque', '$estoque_min'] }
                })
            );
            expect(mockSort).toHaveBeenCalledWith({ estoque: 1 });
        });
    });

    describe('desativarProduto', () => {
        it('deve desativar um produto existente', async () => {
            const id = '123';
            const mockProduto = { _id: id, nome_produto: 'Produto Teste', status: false };

            mockModel.findByIdAndUpdate.mockResolvedValue(mockProduto);

            const result = await produtoRepository.desativarProduto(id);

            expect(result).toEqual(mockProduto);
            expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
                id,
                { status: false },
                { new: true }
            );
        });

        it('deve retornar null quando produto não é encontrado para desativação', async () => {
            const id = '123';
            mockModel.findByIdAndUpdate.mockResolvedValue(null);

            const result = await produtoRepository.desativarProduto(id);
            expect(result).toBeNull();
        });
    });

    describe('reativarProduto', () => {
        it('deve reativar um produto existente', async () => {
            const id = '123';
            const mockProduto = { _id: id, nome_produto: 'Produto Teste', status: true };

            mockModel.findByIdAndUpdate.mockResolvedValue(mockProduto);

            const result = await produtoRepository.reativarProduto(id);

            expect(result).toEqual(mockProduto);
            expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
                id,
                { status: true },
                { new: true }
            );
        });

        it('deve retornar null quando produto não é encontrado para reativação', async () => {
            const id = '123';
            mockModel.findByIdAndUpdate.mockResolvedValue(null);

            const result = await produtoRepository.reativarProduto(id);
            expect(result).toBeNull();
        });
    });
});