export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },
    formField: {
      variants: {
        required: {
          true: {
            label: "after:content-['*'] after:ms-0.5 after:text-muted"
          }
        }
      }
    }
  }
})
