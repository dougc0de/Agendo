export class Money {
    constructor(amount = 0) {
        const numericAmount = Number(amount);

        this.amount = Number.isFinite(numericAmount)
            ? Number(numericAmount.toFixed(2))
            : 0;
    }

    static from(value = 0) {
        return value instanceof Money ? value : new Money(value);
    }

    plus(value = 0) {
        return new Money(this.amount + Money.from(value).amount);
    }

    minus(value = 0) {
        return new Money(this.amount - Money.from(value).amount);
    }

    clampNonNegative() {
        return new Money(Math.max(this.amount, 0));
    }

    isZero() {
        return this.amount === 0;
    }

    isPositive() {
        return this.amount > 0;
    }

    isGreaterThan(value = 0) {
        return this.amount > Money.from(value).amount;
    }

    isGreaterThanOrEqual(value = 0) {
        return this.amount >= Money.from(value).amount;
    }

    toNumber() {
        return this.amount;
    }
}
