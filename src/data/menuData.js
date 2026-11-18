export const CONFIG_LOJA_PADRAO = {
  nomeRestaurante: 'SMASH & CO.',
  subtitulo: 'Burgers Artesanais & Tex-Mex',
  bannerUrl:
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80',
  cupomCodigo: 'BEMVINDO10',
  cupomDescontoPercent: 10,
  taxaGarcomPercent: 10,
  tappoClubAtivo: true,
  tappoClubPontos: 150,
};

export const PRODUTOS_INICIAIS_SEED = [
  {
    nome: 'Smash Clássico Supremo',
    categoria: 'Smash Burgers',
    tag: 'TOP 1 • CASA',
    maisVendido: true,
    disponivel: true,
    descricao:
      'Blend bovino 130g prensado na chapa, queijo cheddar inglês derretido, alface americana crocante, tomate fresco, cebola roxa e molho especial da casa no pão brioche.',
    preco: 34.9,
    likes: 512,
    imagem:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    ingredientes: [
      'Pão Brioche Selado',
      'Blend Bovino 130g',
      'Queijo Cheddar Inglês',
      'Alface Americana',
      'Tomate Fresco',
      'Cebola Roxa',
      'Molho Especial da Casa',
    ],
    adicionais: [
      { id: 'add-carne', nome: 'Carne Smash Extra 110g', preco: 8.0 },
      { id: 'add-bacon', nome: 'Bacon Crocante Artesanal', preco: 4.5 },
      { id: 'add-cheddar', nome: 'Cheddar Cremoso Extra', preco: 3.5 },
      { id: 'add-cebola-caram', nome: 'Cebola Caramelizada', preco: 3.0 },
      { id: 'add-molho', nome: 'Molho Especial Extra', preco: 2.0 },
    ],
  },
  {
    nome: 'Duplo Bacon Caramelizado',
    categoria: 'Smash Burgers',
    tag: 'SMASH DUPLO',
    maisVendido: true,
    disponivel: true,
    descricao:
      'Dois blends smash 110g suculentos, duplo cheddar cremoso, tiras de bacon crocante artesanal, cebola caramelizada no mel e maionese defumada no pão brioche.',
    preco: 39.9,
    likes: 389,
    imagem:
      'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=900&q=80',
    ingredientes: [
      'Pão Brioche Selado',
      '2x Blend Bovino 110g',
      'Duplo Queijo Cheddar',
      'Bacon Crocante',
      'Cebola Caramelizada',
      'Maionese Defumada',
    ],
    adicionais: [
      { id: 'add-carne', nome: 'Carne Smash Extra 110g', preco: 8.0 },
      { id: 'add-bacon', nome: 'Bacon Crocante Extra', preco: 4.5 },
      { id: 'add-cheddar', nome: 'Cheddar Cremoso Extra', preco: 3.5 },
      { id: 'add-ovo', nome: 'Ovo Caipira na Chapa', preco: 2.5 },
    ],
  },
  {
    nome: 'Flautas Mexicanas (Tacos Dourados)',
    categoria: 'Tex-Mex',
    tag: 'MAIS PEDIDO • TEX-MEX',
    maisVendido: true,
    disponivel: true,
    descricao:
      'Tortilhas de milho enroladas e fritas até ficarem crocantes, recheadas com frango desfiado temperado, creme de queijo, pico de gallo e guacamole fresco.',
    preco: 28.9,
    likes: 428,
    imagem:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80',
    ingredientes: [
      'Tortilha de Milho Crocante',
      'Frango Desfiado Temperado',
      'Creme de Queijo',
      'Pico de Gallo',
      'Guacamole Fresco',
    ],
    adicionais: [
      { id: 'add-guac', nome: 'Guacamole Extra', preco: 4.0 },
      { id: 'add-cheddar', nome: 'Cheddar Cremoso', preco: 3.5 },
      { id: 'add-jalapeno', nome: 'Pimenta Jalapeño', preco: 2.5 },
    ],
  },
  {
    nome: 'Nachos Supremos Tex-Mex',
    categoria: 'Tex-Mex',
    tag: 'PARA COMPARTILHAR',
    maisVendido: false,
    disponivel: true,
    descricao:
      'Tortilhas crocantes cobertas com chili de carne artesanal, queijo cheddar derretido, sour cream, guacamole fresco e jalapeños.',
    preco: 42.5,
    likes: 310,
    imagem:
      'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=900&q=80',
    ingredientes: [
      'Tortilhas de Milho',
      'Chili de Carne',
      'Queijo Cheddar Derretido',
      'Sour Cream',
      'Guacamole Fresco',
      'Jalapeños',
    ],
    adicionais: [
      { id: 'add-chili', nome: 'Porção Extra de Chili', preco: 6.5 },
      { id: 'add-guac', nome: 'Guacamole Extra', preco: 4.0 },
    ],
  },
  {
    nome: 'Soda Artesanal Frutas Vermelhas',
    categoria: 'Bebidas',
    tag: 'REFRESCANTE',
    maisVendido: false,
    disponivel: true,
    descricao:
      'Água gaseificada bem gelada com redução artesanal de morango, amora, framboesa e toque de limão siciliano.',
    preco: 14.9,
    likes: 195,
    imagem:
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
    ingredientes: ['Gelo', 'Limão Siciliano', 'Calda Artesanal de Frutas Vermelhas'],
    adicionais: [{ id: 'add-calda', nome: 'Dose Extra de Calda Artesanal', preco: 2.5 }],
  },
  {
    nome: 'Refrigerante Lata 350ml',
    categoria: 'Bebidas',
    tag: 'GELADO',
    maisVendido: false,
    disponivel: true,
    descricao: 'Coca-Cola Original, Coca Zero ou Guaraná Antarctica servido bem gelado.',
    preco: 8.0,
    likes: 140,
    imagem:
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80',
    ingredientes: ['Copo com Gelo e Limão'],
    adicionais: [],
  },
];

export const MESAS_INICIAIS_SEED = [
  { numero: 'Mesa 01', codigo: 'M01', token: 'M01', ativa: true },
  { numero: 'Mesa 02', codigo: 'M02', token: 'M02', ativa: true },
  { numero: 'Mesa 03', codigo: 'M03', token: 'M03', ativa: true },
  { numero: 'Mesa 04', codigo: 'M04', token: 'M04', ativa: true },
];

export const FALLBACK_FOOD_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231f2028'/%3E%3Cstop offset='100%25' stop-color='%23111216'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='85' fill='%23e11d48' fill-opacity='0.18'/%3E%3Ctext x='200' y='212' text-anchor='middle' font-size='68'%3E%F0%9F%8D%94%3C/text%3E%3C/svg%3E";
