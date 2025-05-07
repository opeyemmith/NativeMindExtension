import { registerRewriteOriginRule } from "@/utils/rewrite-origin";

export default defineBackground(() => {
  registerRewriteOriginRule();
  console.log("Hello background!", { id: browser.runtime.id });
});
