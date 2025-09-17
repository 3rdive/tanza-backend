export class NumberUtil {
  // Precise addition avoiding floating point issues
  static add(a: number, b: number): number {
    const aFixed = Number(Number(a).toFixed(2));
    const bFixed = Number(Number(b).toFixed(2));
    const result = aFixed + bFixed;
    return result;
  }

  static subtract(a: number, b: number): number {
    const aFixed = Number(Number(a).toFixed(2));
    const bFixed = Number(Number(b).toFixed(2));
    return aFixed - bFixed;
  }

  static multiply(a: number, b: number): number {
    const aFixed = Number(Number(a).toFixed(2));
    const bFixed = Number(Number(b).toFixed(2));
    return aFixed * bFixed;
  }

  static divide(a: number, b: number): number {
    const aFixed = Number(Number(a).toFixed(2));
    const bFixed = Number(Number(b).toFixed(2));
    if (bFixed === 0) throw new Error('Division by zero');
    const result = aFixed / bFixed;
    return Number(Number(result).toFixed(2));
  }

  static percentage(part: number, total: number): number {
    const partFixed = Number(Number(part).toFixed(2));
    const totalFixed = Number(Number(total).toFixed(2));
    if (totalFixed === 0) return 0;
    const result = (partFixed / totalFixed) * 100;
    return Number(Number(result).toFixed(2));
  }
}
