/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const discount = 1 - purchase.discount / 100;

  return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, { profit }) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  if (index === 0) {
    return 0.15 * profit;
  }

  if (index === 1 || index === 2) {
    return 0.1 * profit;
  }

  if (index === total - 1) {
    return 0;
  }

  return 0.05 * profit;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !(Array.isArray(data.sellers) && data.sellers.length) ||
    !(Array.isArray(data.products) && data.products.length) ||
    !(Array.isArray(data.purchase_records) && data.purchase_records.length)
  ) {
    throw new Error('Некорректные входные данные');
  }

  // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;

  if (
    !(calculateRevenue && typeof calculateRevenue === 'function') ||
    !(calculateBonus && typeof calculateBonus === 'function')
  ) {
    throw new Error('Чего-то не хватает');
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellersStats = data.sellers.map((seller) => {
    seller.seller_id = seller.id;
    seller.name = `${seller.first_name} ${seller.last_name}`;

    return seller;
  });

  // @TODO: Индексация продавцов и товаров для быстрого доступа

  const sellersIndex = data.sellers.reduce(
    (result, item) => ({
      ...result,
      [item.id]: item,
    }),
    {},
  );

  const productsIndex = data.products.reduce(
    (result, item) => ({
      ...result,
      [item.sku]: item,
    }),
    {},
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца

  data.purchase_records.forEach((record) => {
    // Чек

    const seller = sellersIndex[record.seller_id]; // Продавец

    // Увеличить количество продаж
    if (!seller.sales_count) {
      seller.sales_count = 1;
    } else {
      seller.sales_count++;
    }

    // Увеличить общую сумму всех продаж
    if (!seller.revenue) {
      seller.revenue = record.total_amount;
    } else {
      seller.revenue += record.total_amount;
    }

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productsIndex[item.sku]; // Товар

      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const cost = product.purchase_price * product.quantity;

      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const revenue = calculateRevenue(item, product);

      // Посчитать прибыль: выручка минус себестоимость
      const profit = revenue - product.purchase_price * item.quantity;

      // Увеличить общую накопленную прибыль (profit) у продавца
      if (!seller.profit) {
        seller.profit = 0;
      }

      seller.profit += profit;

      // Учёт количества проданных товаров
      if (!seller.products_sold) {
        seller.products_sold = {};
      }

      if (!seller.products_sold?.[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }

      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellersStats.sort((seller1, seller2) => seller2.profit - seller1.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellersStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellersStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku,
        quantity,
      }))
      .sort((product1, product2) => product2.quantity - product1.quantity)
      .slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellersStats.map(
    ({ id, name, revenue, profit, sales_count, top_products, bonus }) => ({
      seller_id: id, // Строка, идентификатор продавца
      name, // Строка, имя продавца
      revenue: +revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
      profit: +profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
      sales_count, // Целое число, количество продаж продавца
      top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
      bonus: +bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
    }),
  );
}
