/*
 Copyright: Copyright (c) 2025 Dyumnin Semiconductors. All rights reserved.
 Author: Vijayvithal <jahagirdar.vs@gmail.com>
 Created on: 2025-12-26
 Description: A brief description of the file's purpose.
*/
package tree_sitter_bsv

// #cgo CFLAGS: -std=c11 -fPIC
// #include "../../src/parser.c"
// #if __has_include("../../src/scanner.c")
// #include "../../src/scanner.c"
// #endif
import "C"

import "unsafe"

// Get the tree-sitter Language for this grammar.
func Language() unsafe.Pointer {
	return unsafe.Pointer(C.tree_sitter_bsv())
}
