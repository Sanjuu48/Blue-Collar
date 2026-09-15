import express from "express";
import { auth } from "../Middlewares/auth.js";

import {
    getUserCreations,
    getPublishCreations,
    toggleLikeCreations
} from "../Controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/get-user-creations", auth, getUserCreations);

userRouter.get(
    "/get-published-creations",
    auth,
    getPublishCreations
);

userRouter.post(
    "/toggle-like-creation",
    auth,
    toggleLikeCreations
);

export default userRouter;
