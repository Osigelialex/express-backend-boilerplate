import { EMAIL_JOB, EMAIL_SUBJECTS } from "@/config/constants/email";
import type { MailTransport } from "@/interfaces/email.interface";
import { processEmailJob } from "@/workers/email.worker";

describe("processEmailJob", () => {
  const data = { to: "jane@example.com", name: "Jane", otp: "123456" };

  const transport = () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    return { sendMail, transport: { sendMail } as MailTransport };
  };

  it("sends the verification email with the code in the body", async () => {
    const { sendMail, transport: t } = transport();
    await processEmailJob({ name: EMAIL_JOB.verification, data }, t);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toEqual({ address: "jane@example.com", name: "Jane" });
    expect(message.subject).toBe(EMAIL_SUBJECTS.verification);
    expect(message.html).toContain("123456");
  });

  it("sends the password reset email", async () => {
    const { sendMail, transport: t } = transport();
    await processEmailJob({ name: EMAIL_JOB.passwordReset, data }, t);

    expect(sendMail.mock.calls[0][0].subject).toBe(EMAIL_SUBJECTS.passwordReset);
  });

  it("escapes user-controlled names in the HTML", async () => {
    const { sendMail, transport: t } = transport();
    await processEmailJob(
      {
        name: EMAIL_JOB.verification,
        data: { ...data, name: "<script>alert(1)</script>" },
      },
      t,
    );

    const { html } = sendMail.mock.calls[0][0];
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("throws for unknown jobs and propagates transport failures (retry)", async () => {
    const { transport: t } = transport();
    await expect(processEmailJob({ name: "nope", data }, t)).rejects.toThrow(
      /Unknown email job/,
    );

    const failing: MailTransport = {
      sendMail: jest.fn().mockRejectedValue(new Error("smtp down")),
    };
    await expect(
      processEmailJob({ name: EMAIL_JOB.verification, data }, failing),
    ).rejects.toThrow("smtp down");
  });
});
