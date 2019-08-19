# == Schema Information
#
# Table name: tickets
#
#  id                 :integer          not null, primary key
#  event_id           :integer
#  name               :string
#  price              :float
#  stock              :integer
#  kind               :integer
#  active             :boolean
#  start_date         :datetime
#  end_date           :datetime
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  image_file_name    :string
#  image_content_type :string
#  image_file_size    :integer
#  image_updated_at   :datetime
#

class TicketSerializer < ActiveModel::Serializer
  attributes :id, :name, :price, :stock, :active, :start_date, :end_date
end
