export const getPagination = ({ page, limit }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

export const buildPaginationResult = ({ items, total, page, limit }) => ({
  items,
  total,
  page,
  limit,
  hasNextPage: page * limit < total,
});
