export const orderingApiPath = (path: string) =>
  `${process.env.NODE_ENV === "production" ? "/etandoori" : ""}/api/${path}`;
