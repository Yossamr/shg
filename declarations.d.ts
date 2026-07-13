
declare module 'otpauth' {
    export class TOTP {
        constructor(options?: any);
        generate(options?: any): string;
        validate(options?: { token: string; window?: number }): number | null;
        toString(): string;
    }
    export class Secret {
        static fromBase32(str: string): Secret;
        static fromHex(str: string): Secret;
    }
}
