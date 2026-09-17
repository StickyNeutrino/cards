import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("card-lists", "routes/card-lists.tsx"),
  route("credits", "routes/credits.tsx"),
  route("privacy", "routes/privacy.tsx")
] satisfies RouteConfig;