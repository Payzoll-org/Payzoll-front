import { AiOutlineCodeSandbox } from "react-icons/ai";



const AddWebhook = () => {
  return (
    <div className="px-4">
      <div className="text-sm border-b py-4 text-gray-600">
        <div className="flex gap-2">
             <AiOutlineCodeSandbox className="text-xl"/>
            <h1>Webhooks</h1>
        </div>
        <p className="mt-2">Configure your webhook URL to receive real-time event notifications.(Learn more)</p>
      </div>
      <div className="flex text-sm py-4 px-1 gap-3 font-medium flex-col">
        <h1>URL</h1>
        <input
          className="rounded-sm px-3 ring-0 text-md py-1.5 w-100 border"
          type="text"
          placeholder="Enter Webhook URL"
        />
      </div>
    </div>
  )
}

export default AddWebhook