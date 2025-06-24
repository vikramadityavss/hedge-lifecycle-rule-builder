declare module 'jsonlogic' {
  /**
   * Applies JSON Logic rules to data
   * @param rules - The JSON Logic rules to apply
   * @param data - The data to apply the rules to
   * @returns The result of applying the rules to the data
   */
  function apply(rules: any, data: any): any;

  /**
   * Adds a new operator to JsonLogic
   * @param name - The name of the operator
   * @param handler - The function to handle the operator
   */
  function add_operation(name: string, handler: (...args: any[]) => any): void;

  /**
   * Gets a specific operation from JsonLogic
   * @param name - The name of the operation to retrieve
   * @returns The operation handler function
   */
  function get_operation(name: string): (...args: any[]) => any;

  /**
   * Adds a custom operator that uses values, not data
   * @param name - The name of the operator
   * @param handler - The function to handle the operator
   */
  function add_data_operation(name: string, handler: (...args: any[]) => any): void;

  const operations: Record<string, (...args: any[]) => any>;

  export { apply, add_operation, get_operation, add_data_operation, operations };
  export default { apply, add_operation, get_operation, add_data_operation, operations };
}