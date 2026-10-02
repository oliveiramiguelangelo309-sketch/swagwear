// Catálogo enxuto em dois drops, com as fotos oficiais das camisetas SwagWear.
// As imagens ficam em assets/produtos e são servidas pelo próprio site.
function camiseta({ id, nome, preco, descricao, cor, colecao, arquivo, estoque = 15 }) {
  return {
    id,
    nome,
    preco,
    descricao,
    tipo: 'camiseta',
    categoria: 'parte_superior',
    cor,
    estilo: 'streetwear',
    colecao,
    imagem: `assets/produtos/${arquivo}`,
    imagem_sem_fundo: null,
    estoque
  };
}

// Drop 01: baby tees de corte ajustado, com estampas coloridas.
const DROP_01 = 'Baby Tee';

// Drop 02: camisetas de corte reto da linha SwagWear Corporation.
const DROP_02 = 'Corporation';

module.exports = [
  camiseta({
    id: 1,
    nome: 'Art Is My Life Baby Tee',
    preco: 139.0,
    descricao: 'Baby tee branca com a frase "Art Is My Life" pintada em aquarela colorida.',
    cor: 'branco',
    colecao: DROP_01,
    arquivo: 'art-is-my-life-baby-tee.webp'
  }),
  camiseta({
    id: 2,
    nome: 'Wild Horses Baby Tee',
    preco: 139.0,
    descricao: 'Baby tee branca com três cavalos em verde, vermelho e azul com efeito desgastado.',
    cor: 'branco',
    colecao: DROP_01,
    arquivo: 'wild-horses-baby-tee.webp'
  }),
  camiseta({
    id: 3,
    nome: 'Swag Logo Baby Tee',
    preco: 149.0,
    descricao: 'Baby tee branca com o logo SwagWear Corporation em rosa, estrela amarela e marcas de tiro.',
    cor: 'branco',
    colecao: DROP_01,
    arquivo: 'swag-logo-baby-tee.webp'
  }),
  camiseta({
    id: 4,
    nome: 'Star Girls Baby Tee',
    preco: 149.0,
    descricao: 'Baby tee branca com duas silhuetas sobre estrelas rosa com efeito rachado.',
    cor: 'branco',
    colecao: DROP_01,
    arquivo: 'star-girls-baby-tee.webp'
  }),
  camiseta({
    id: 5,
    nome: 'Rosary Tee',
    preco: 129.0,
    descricao: 'Camiseta branca com estampa de terço prateado caindo do pescoço.',
    cor: 'branco',
    colecao: DROP_02,
    arquivo: 'rosary-tee.webp'
  }),
  camiseta({
    id: 6,
    nome: 'SwagWear Script Tee',
    preco: 119.0,
    descricao: 'Camiseta branca com "SwagWear" em letra cursiva cinza na lateral.',
    cor: 'branco',
    colecao: DROP_02,
    arquivo: 'swagwear-script-tee.webp'
  }),
  camiseta({
    id: 7,
    nome: 'Quinto Army Tee',
    preco: 139.0,
    descricao: 'Camiseta branca com brasão de águia "Quinto Army" em cinza desgastado.',
    cor: 'branco',
    colecao: DROP_02,
    arquivo: 'quinto-army-tee.webp'
  }),
  camiseta({
    id: 8,
    nome: 'Hate Normal People Tee',
    preco: 149.0,
    descricao: 'Camiseta branca com "Swag Wear - Hate normal people - Made in Brasil" em rosa, azul e amarelo.',
    cor: 'branco',
    colecao: DROP_02,
    arquivo: 'hate-normal-people-tee.webp'
  }),
  camiseta({
    id: 9,
    nome: 'Basic Tee Branca',
    preco: 89.0,
    descricao: 'Camiseta básica branca com etiqueta SwagWear na gola.',
    cor: 'branco',
    colecao: DROP_02,
    arquivo: 'basic-branca-tee.webp'
  }),
  camiseta({
    id: 10,
    nome: 'Basic Tee Preta',
    preco: 89.0,
    descricao: 'Camiseta básica preta com etiqueta SwagWear na gola.',
    cor: 'preto',
    colecao: DROP_02,
    arquivo: 'basic-preta-tee.webp'
  })
];
