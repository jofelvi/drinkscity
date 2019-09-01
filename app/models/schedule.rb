# == Schema Information
#
# Table name: schedules
#
#  id          :integer          not null, primary key
#  store_id    :integer
#  day_of_week :integer
#  opens       :string
#  closes      :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

class Schedule < ApplicationRecord
  belongs_to :store
  enum day_of_week: [ :Lunes, :Martes, :Miercoles, :Jueves, :Viernes, :Sabado, :Domingo ]
  validates :day_of_week, presence: true
  validates :opens, presence: true
  validates :closes, presence: true
end
