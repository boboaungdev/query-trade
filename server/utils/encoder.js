import { hashSync, compareSync } from "bcryptjs";

export const Encoder = {
  encode: (password) => hashSync(password, 10),
  compare: (plain, hash) => compareSync(plain, hash),
};
