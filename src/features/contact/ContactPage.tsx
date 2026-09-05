import { useId, useState, type FormEvent } from "react";
import { site } from "@/app/site";
import { useDocumentTitle } from "@/app/useDocumentTitle";
import { Button } from "@/components/Button";
import { Container } from "@/components/Container";
import { Icon } from "@/components/Icon";
import {
  validateContact,
  type ContactErrors,
  type ContactInput,
} from "@/domain/contact";
import { useApi, useSendContact } from "@/lib/api";
import styles from "./Contact.module.css";

const empty: ContactInput = { name: "", email: "", subject: "", message: "" };

export function ContactPage() {
  useDocumentTitle("Contact us");
  const id = useId();
  const [values, setValues] = useState<ContactInput>(empty);
  const [errors, setErrors] = useState<ContactErrors>({});
  const send = useSendContact();
  const { delivers } = useApi();

  const update =
    (field: keyof ContactInput) => (event: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      if (errors[field])
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    send.mutate(values);
  };

  const field = (
    name: keyof ContactInput,
    label: string,
    extra?: { type?: string; multiline?: boolean; autoComplete?: string },
  ) => {
    const inputId = `${id}-${name}`;
    const errorId = `${inputId}-error`;
    const error = errors[name];
    const shared = {
      id: inputId,
      name,
      value: values[name],
      onChange: update(name),
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
      autoComplete: extra?.autoComplete,
    };
    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {extra?.multiline ? (
          <textarea {...shared} className={styles.textarea} />
        ) : (
          <input
            {...shared}
            type={extra?.type ?? "text"}
            className={styles.input}
          />
        )}
        {error ? (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Talk to us</h1>
        <p className={styles.intro}>
          A question about an event, an idea for the programme, or you just want
          to say hello. Every one of these reaches the committee, and someone
          will come back to you.
        </p>
      </header>

      {/*
        The ways through come first, and the form after. While submissions have nowhere to go
        the form is not shown at all: these are what work, so they should not be a footnote
        under something that does not.
      */}
      <section className={styles.ways} aria-labelledby="ways-title">
        <h2 id="ways-title" className={styles.srOnly}>
          Ways to reach us
        </h2>
        <ul className={styles.channels}>
          <li className={styles.channel}>
            <Icon name="message" size={26} className={styles.channelIcon} />
            <h3 className={styles.channelName}>Email</h3>
            <p className={styles.channelBlurb}>
              The surest way to reach the committee, and where to write about
              anything to do with your details on this site.
            </p>
            <a className={styles.channelLink} href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </li>

          {site.social.map((channel) => (
            <li key={channel.name} className={styles.channel}>
              <Icon
                name={channel.icon}
                size={26}
                className={styles.channelIcon}
              />
              <h3 className={styles.channelName}>{channel.name}</h3>
              <p className={styles.channelBlurb}>{channel.blurb}</p>
              {channel.href ? (
                <a
                  className={styles.channelLink}
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open {channel.name}
                  <Icon name="external" size={15} />
                </a>
              ) : (
                <span className={styles.channelNote}>
                  No link to give out yet
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {delivers ? (
        <section className={styles.main} aria-labelledby="form-title">
          <h2 id="form-title" className={styles.formTitle}>
            Or send a message from here
          </h2>
          {send.isSuccess ? (
            <section className={styles.sent} aria-live="polite">
              <h2 className={styles.sentTitle}>
                Thank you, {send.data.name.trim().split(" ")[0]}.
              </h2>
              <p className={styles.sentText}>
                Your message is with the committee. We will reply to{" "}
                {send.data.email} within a few days.
              </p>
              <div>
                <Button
                  variant="line"
                  size="sm"
                  onClick={() => {
                    send.reset();
                    setValues(empty);
                  }}
                >
                  Send another
                </Button>
              </div>
            </section>
          ) : (
            <form
              className={styles.form}
              onSubmit={onSubmit}
              noValidate
              aria-label="Contact form"
            >
              {field("name", "Your name", { autoComplete: "name" })}
              {field("email", "Email", {
                type: "email",
                autoComplete: "email",
              })}
              {field("subject", "Subject")}
              {field("message", "Message", { multiline: true })}
              <div className={styles.actions}>
                <Button type="submit" disabled={send.isPending}>
                  {send.isPending ? "Sending…" : "Send message"}
                </Button>
                {send.isError ? (
                  <p className={styles.error} role="alert">
                    {send.error instanceof Error
                      ? send.error.message
                      : "Something went wrong. Please try again."}
                  </p>
                ) : (
                  <p className={styles.hint}>
                    We only use your email to reply.
                  </p>
                )}
              </div>
            </form>
          )}
        </section>
      ) : null}
    </Container>
  );
}
