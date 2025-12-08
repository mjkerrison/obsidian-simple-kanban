import type { FilterExpression } from '../types';

type TokType = 'TAG' | 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN' | 'EMPTY' | 'EOF';
interface Token {
  type: TokType;
  value?: string;
}

class Lexer {
  private i = 0;
  constructor(private s: string) {}

  next(): Token {
    const n = this.s.length;
    while (this.i < n && /\s/.test(this.s[this.i]!)) this.i++;
    if (this.i >= n) return { type: 'EOF' };
    const ch = this.s[this.i]!;
    if (ch === '(') {
      this.i++;
      return { type: 'LPAREN' };
    }
    if (ch === ')') {
      this.i++;
      return { type: 'RPAREN' };
    }
    if (ch === '#') {
      let j = this.i + 1;
      while (j < n && /[\w\/-]/.test(this.s[j]!)) j++;
      const tag = this.s.slice(this.i, j);
      this.i = j;
      return { type: 'TAG', value: tag };
    }
    // read word
    if (/[A-Za-z]/.test(ch)) {
      let j = this.i + 1;
      while (j < n && /[A-Za-z]/.test(this.s[j]!)) j++;
      const word = this.s.slice(this.i, j).toUpperCase();
      this.i = j;
      if (word === 'AND') return { type: 'AND' };
      if (word === 'OR') return { type: 'OR' };
      if (word === 'NOT') return { type: 'NOT' };
      if (word === 'EMPTY') return { type: 'EMPTY' };
      // Unknown bare word: treat as tag name by prefixing '#'
      return { type: 'TAG', value: `#${word.toLowerCase()}` };
    }
    // Unknown char: skip and continue
    this.i++;
    return this.next();
  }
}

// Pratt parser with precedence: NOT > AND > OR
class Parser {
  private lookahead: Token;
  constructor(private lexer: Lexer) {
    this.lookahead = this.lexer.next();
  }

  parse(): FilterExpression {
    if (this.lookahead.type === 'EOF') return { type: 'or', children: [] };
    const expr = this.parseOr();
    return expr;
  }

  private consume(type: TokType): Token {
    if (this.lookahead.type !== type) {
      throw new Error(`Expected ${type} but found ${this.lookahead.type}`);
    }
    const t = this.lookahead;
    this.lookahead = this.lexer.next();
    return t;
  }

  private parseOr(): FilterExpression {
    let left = this.parseAnd();
    const children: FilterExpression[] = [left];
    while (this.lookahead.type === 'OR') {
      this.consume('OR');
      const right = this.parseAnd();
      children.push(right);
    }
    if (children.length === 1) return left;
    return { type: 'or', children };
  }

  private parseAnd(): FilterExpression {
    let left = this.parseNot();
    const children: FilterExpression[] = [left];
    while (this.lookahead.type === 'AND') {
      this.consume('AND');
      const right = this.parseNot();
      children.push(right);
    }
    if (children.length === 1) return left;
    return { type: 'and', children };
  }

  private parseNot(): FilterExpression {
    if (this.lookahead.type === 'NOT') {
      this.consume('NOT');
      const inner = this.parseNot();
      return { type: 'not', children: [inner] };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FilterExpression {
    switch (this.lookahead.type) {
      case 'LPAREN': {
        this.consume('LPAREN');
        const expr = this.parseOr();
        if (this.lookahead.type !== 'RPAREN') throw new Error('Unmatched (');
        this.consume('RPAREN');
        return expr;
      }
      case 'TAG': {
        const t = this.consume('TAG');
        return { type: 'tag', value: t.value };
      }
      case 'EMPTY': {
        this.consume('EMPTY');
        return { type: 'empty' };
      }
      default:
        // Unexpected token: skip it and try to continue; fallback to match-all
        this.lookahead = this.lexer.next();
        return { type: 'or', children: [] };
    }
  }
}

export function parseFilterString(input: string): FilterExpression {
  const s = input.trim();
  if (s === '') return { type: 'or', children: [] };
  try {
    const parser = new Parser(new Lexer(s));
    return parser.parse();
  } catch (e) {
    console.warn('[Simple Kanban] Filter parse error:', e);
    return { type: 'or', children: [] };
  }
}

/**
 * Convert a FilterExpression AST back to a filter string.
 * Used by the settings GUI to display existing filters as editable text.
 */
export function stringifyFilter(expr: FilterExpression): string {
  switch (expr.type) {
    case 'empty':
      return 'EMPTY';
    case 'tag':
      return expr.value ?? '';
    case 'not': {
      if (!expr.children?.length) return '';
      const inner = stringifyFilter(expr.children[0]);
      // Wrap in parens if inner is compound (contains spaces = has operators)
      return inner.includes(' ') ? `NOT (${inner})` : `NOT ${inner}`;
    }
    case 'and': {
      if (!expr.children?.length) return '';
      return expr.children
        .map((c) => {
          const s = stringifyFilter(c);
          // Wrap OR children in parens for correct precedence
          return c.type === 'or' && (c.children?.length ?? 0) > 1 ? `(${s})` : s;
        })
        .join(' AND ');
    }
    case 'or': {
      if (!expr.children?.length) return ''; // empty OR = match all
      return expr.children.map((c) => stringifyFilter(c)).join(' OR ');
    }
    default:
      return '';
  }
}
