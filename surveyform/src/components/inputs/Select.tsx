"use client";
import { useIntlContext } from "@devographics/react-i18n";
import type { FormInputProps } from "~/components/form/typings";
import Form from "react-bootstrap/Form";
import { FormItem } from "~/components/form/FormItem";
import { getOptioni18nIds } from "@devographics/i18n";

export const FormComponentSelect = (props: FormInputProps) => {
  const {
    survey,
    edition,
    section,
    path,
    value,
    question,
    updateCurrentValues,
    readOnly,
  } = props;
  const { options, optionsAreNumeric } = question;
  const intl = useIntlContext();
  const emptyValue = "";
  const noneOption = {
    label: intl.formatMessage({ id: "forms.select_option" }),
    id: emptyValue,
    disabled: true,
  };
  let otherOptions = Array.isArray(options) && options.length ? options : [];
  const allOptions = [noneOption, ...otherOptions];
  return (
    <FormItem {...props}>
      <Form.Select
        // ref={refFunction}
        defaultValue={emptyValue}
        onChange={(e) => {
          updateCurrentValues({ [path]: e.target.value });
        }}
        disabled={readOnly}
        value={value?.toString()}
      >
        {allOptions.map((option) => {
          const { id, label } = option;
          const i18n = getOptioni18nIds({
            question,
            option,
          });
          const optionLabel =
            label ||
            intl.formatMessage({
              id: i18n.base,
            });
          return (
            <option key={id} value={id}>
              {optionLabel}
            </option>
          );
        })}
      </Form.Select>
    </FormItem>
  );
};

export default FormComponentSelect;
