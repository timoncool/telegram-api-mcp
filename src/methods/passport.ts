import { z } from "zod";
import { MethodDef, UserId } from "../method-registry.js";

export const passportMethods: MethodDef[] = [
  {
    apiMethod: "setPassportDataErrors", toolName: "set_passport_data_errors",
    description: "Inform a user that some Telegram Passport elements contain errors.", category: "passport",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
      { name: "errors", type: z.any(), required: true, description: "Array of PassportElementError objects" },
    ],
  },
];
