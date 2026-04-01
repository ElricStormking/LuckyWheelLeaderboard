import {
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

interface CustomerPlatformSoapEligibilityResult {
  code?: string;
  depositUrl?: string;
  errorMessage?: string;
  memo?: string;
  isEligible: boolean;
  status: boolean;
}

@Injectable()
export class CustomerPlatformSoapClientService {
  private readonly endpoint =
    process.env.CUSTOMER_PLATFORM_SOAP_URL ??
    "http://vv-ibet-service-myr0.i16888.cc/iBetService.svc";
  private readonly soapAction =
    process.env.CUSTOMER_PLATFORM_SOAP_ACTION ??
    "http://tempuri.org/IiBetService/LuckyWheel_Deposit_isEligible";
  private readonly compAccessKey =
    process.env.CUSTOMER_PLATFORM_COMP_ACCESSKEY ?? "";
  private readonly siteId = process.env.CUSTOMER_PLATFORM_SITE_ID ?? "A";
  private readonly timeoutMs = this.parseInteger(
    process.env.CUSTOMER_PLATFORM_TIMEOUT_MS,
    2000,
  );
  private readonly recordDateTimezone =
    process.env.CUSTOMER_PLATFORM_RECORD_DATE_TIMEZONE ?? "Asia/Taipei";

  isEnabled() {
    return (
      (process.env.CUSTOMER_PLATFORM_SOAP_ENABLED ?? "").toLowerCase() ===
        "true" || this.compAccessKey.length > 0
    );
  }

  async fetchDepositEligibility(playerId: string) {
    if (!this.compAccessKey) {
      throw new ServiceUnavailableException(
        "Customer Platform SOAP integration is not configured.",
      );
    }

    const recordDate = this.resolveRecordDate(new Date());
    const requestBody = this.buildEnvelope({
      playerId,
      recordDate,
    });
    const responseXml = await this.sendRequest(requestBody);
    const parsed = this.parseEligibilityResponse(responseXml);

    if (!parsed.status) {
      const reason = parsed.errorMessage ?? parsed.code ?? "unknown error";
      throw new ServiceUnavailableException(
        `Customer Platform eligibility request failed: ${reason}`,
      );
    }

    return {
      ...parsed,
      recordDate,
    };
  }

  private async sendRequest(requestBody: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Accept: "text/xml",
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `"${this.soapAction}"`,
        },
        body: requestBody,
        signal: controller.signal,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Customer Platform SOAP request failed with status ${response.status}.`,
        );
      }

      return responseText;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (this.isAbortError(error)) {
        throw new GatewayTimeoutException(
          "Customer Platform SOAP request timed out.",
        );
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Customer Platform SOAP request failed: ${error.message}`
          : "Customer Platform SOAP request failed.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseEligibilityResponse(
    responseXml: string,
  ): CustomerPlatformSoapEligibilityResult {
    const faultString = this.extractTagValue(responseXml, "faultstring");
    if (faultString) {
      throw new ServiceUnavailableException(
        `Customer Platform SOAP fault: ${faultString}`,
      );
    }

    return {
      code: this.extractTagValue(responseXml, "Code"),
      depositUrl: this.extractTagValue(responseXml, "DepositUrl"),
      errorMessage: this.extractTagValue(responseXml, "ErrorMsg"),
      memo: this.extractTagValue(responseXml, "Memo"),
      isEligible: this.extractBooleanTag(responseXml, "IsEligible") ?? false,
      status: this.extractBooleanTag(responseXml, "Status") ?? false,
    };
  }

  private buildEnvelope(input: { playerId: string; recordDate: string }) {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <LuckyWheel_Deposit_isEligible xmlns="http://tempuri.org/">
      <CompAccesskey>${this.escapeXml(this.compAccessKey)}</CompAccesskey>
      <SiteID>${this.escapeXml(this.siteId)}</SiteID>
      <Account>${this.escapeXml(input.playerId)}</Account>
      <RecordDate>${input.recordDate}</RecordDate>
    </LuckyWheel_Deposit_isEligible>
  </soap:Body>
</soap:Envelope>`;
  }

  private resolveRecordDate(now: Date) {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: this.recordDateTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find((part) => part.type === "year")?.value ?? "1970";
      const month =
        parts.find((part) => part.type === "month")?.value ?? "01";
      const day = parts.find((part) => part.type === "day")?.value ?? "01";
      return `${year}-${month}-${day}T00:00:00`;
    } catch {
      return now.toISOString().slice(0, 10) + "T00:00:00";
    }
  }

  private extractTagValue(xml: string, tagName: string) {
    const pattern = new RegExp(
      `<(?:\\w+:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tagName}>`,
      "i",
    );
    const match = xml.match(pattern);
    return match ? this.decodeXml(match[1].trim()) : undefined;
  }

  private extractBooleanTag(xml: string, tagName: string) {
    const value = this.extractTagValue(xml, tagName)?.toLowerCase();
    if (!value) {
      return undefined;
    }

    return value === "true" || value === "1";
  }

  private escapeXml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  private decodeXml(value: string) {
    return value
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'")
      .replaceAll("&amp;", "&");
  }

  private parseInteger(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private isAbortError(error: unknown) {
    return (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    );
  }
}
