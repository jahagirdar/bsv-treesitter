/*
 Copyright: Copyright (c) 2025 Dyumnin Semiconductors. All rights reserved.
 Author: Vijayvithal <jahagirdar.vs@gmail.com>
 Created on: 2025-12-26
 Description: A brief description of the file's purpose.
*/
import assert from "node:assert";
import { test } from "node:test";
import Parser from "tree-sitter";

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotReject(async () => {
    const { default: language } = await import("./index.js");
    parser.setLanguage(language);
  });
});
